import React, { useState, useEffect } from 'react';
import { initializeApp } from 'firebase/app';
import { 
  getAuth, 
  signInWithCustomToken, 
  signInAnonymously, 
  onAuthStateChanged,
  signOut 
} from 'firebase/auth';
import { 
  getFirestore, 
  doc, 
  setDoc, 
  onSnapshot, 
  collection, 
  query, 
  addDoc, 
  updateDoc,
  deleteDoc,
  serverTimestamp 
} from 'firebase/firestore';
import { 
  Plus, 
  Layout, 
  Search, 
  LogOut, 
  ChevronRight, 
  MoreVertical,
  Presentation,
  FileText,
  Palette,
  Bell,
  Settings,
  Image as ImageIcon,
  Type,
  Square,
  Play,
  Share2,
  Undo2,
  Redo2,
  ChevronLeft,
  Trash2
} from 'lucide-react';

// --- Firebase Configuration ---
const firebaseConfig = {
  apiKey: "AIzaSyDYI4Avd42wjJa3YOSKuGHhSCGgLFLZvik",
  authDomain: "presently-3babd.firebaseapp.com",
  projectId: "presently-3babd",
  storageBucket: "presently-3babd.firebasestorage.app",
  messagingSenderId: "646349632966",
  appId: "1:646349632966:web:70780e1952d3144842aec7",
  measurementId: "G-S78VX3DRBV"
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);
const appId = typeof __app_id !== 'undefined' ? __app_id : 'presently-default';

// --- Stable Components ---
const AuthWrapper = ({ children, title, subtitle }) => (
  <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
    <div className="max-w-md w-full bg-white rounded-2xl shadow-xl overflow-hidden flex flex-col md:flex-row md:max-w-4xl">
      <div className="hidden md:flex md:w-1/2 bg-orange-600 p-12 text-white flex-col justify-between">
        <div>
          <div className="flex items-center gap-2 mb-8">
            <Presentation size={32} />
            <span className="text-2xl font-bold tracking-tight">Presently</span>
          </div>
          <h1 className="text-4xl font-extrabold leading-tight mb-4">Bring your ideas to life.</h1>
          <p className="text-orange-100 text-lg">The most intuitive way to build, share, and present your stories.</p>
        </div>
        <div className="text-sm text-orange-200">© 2024 Presently Inc.</div>
      </div>
      <div className="w-full md:w-1/2 p-8 md:p-12">
        <h2 className="text-2xl font-bold text-slate-800 mb-2">{title}</h2>
        <p className="text-slate-500 mb-8">{subtitle}</p>
        {children}
      </div>
    </div>
  </div>
);

const App = () => {
  const [user, setUser] = useState(null);
  const [view, setView] = useState('loading'); // loading, login, signup, home, editor
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  
  // Data State
  const [presentations, setPresentations] = useState([]);
  const [activePres, setActivePres] = useState(null);
  const [currentSlideIndex, setCurrentSlideIndex] = useState(0);

  // --- Auth Logic ---
  useEffect(() => {
    const initAuth = async () => {
      try {
        if (typeof __initial_auth_token !== 'undefined' && __initial_auth_token) {
          await signInWithCustomToken(auth, __initial_auth_token);
        } else {
          await signInAnonymously(auth);
        }
      } catch (err) {
        console.error("Auth error", err);
      }
    };
    initAuth();
    const unsubscribe = onAuthStateChanged(auth, (u) => {
      setUser(u);
      if (u) setView('home');
      else setView('login');
    });
    return () => unsubscribe();
  }, []);

  // --- Data Sync Logic ---
  useEffect(() => {
    if (!user) return;
    const q = query(collection(db, 'artifacts', appId, 'users', user.uid, 'presentations'));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const docs = snapshot.docs.map(d => ({ id: d.id, ...d.data() }));
      setPresentations(docs);
    }, (err) => console.error("Firestore error", err));
    return () => unsubscribe();
  }, [user]);

  const handleAuthSubmit = (e) => {
    e.preventDefault();
    // For this preview, anonymous auth is handled by useEffect. 
    // Usually you'd call createUserWithEmailAndPassword here.
    setView('home');
  };

  const createNewPresentation = async () => {
    if (!user) return;
    const newDoc = {
      title: "Untitled Presentation",
      createdAt: serverTimestamp(),
      ownerId: user.uid,
      slides: [
        { 
          elements: [
            { id: '1', type: 'text', content: 'Double click to edit title', x: 20, y: 30, fontSize: 40, bold: true },
            { id: '2', type: 'text', content: 'Add a subtitle here', x: 30, y: 50, fontSize: 20 }
          ] 
        }
      ]
    };
    const docRef = await addDoc(collection(db, 'artifacts', appId, 'users', user.uid, 'presentations'), newDoc);
    openPresentation({ id: docRef.id, ...newDoc });
  };

  const openPresentation = (pres) => {
    setActivePres(pres);
    setCurrentSlideIndex(0);
    setView('editor');
  };

  const saveActivePres = async (updatedPres) => {
    if (!user || !updatedPres?.id) return;
    const { id, ...data } = updatedPres;
    await updateDoc(doc(db, 'artifacts', appId, 'users', user.uid, 'presentations', id), data);
  };

  const addSlide = () => {
    const updated = { ...activePres };
    updated.slides.push({ elements: [] });
    setActivePres(updated);
    setCurrentSlideIndex(updated.slides.length - 1);
    saveActivePres(updated);
  };

  const addElement = (type) => {
    const updated = { ...activePres };
    const newElement = {
      id: Math.random().toString(36).substr(2, 9),
      type,
      content: type === 'text' ? 'New Text' : '',
      x: 40,
      y: 40,
      width: type === 'shape' ? 100 : 'auto',
      height: type === 'shape' ? 100 : 'auto',
      fontSize: type === 'text' ? 24 : undefined
    };
    updated.slides[currentSlideIndex].elements.push(newElement);
    setActivePres(updated);
    saveActivePres(updated);
  };

  if (view === 'loading') return <div className="h-screen flex items-center justify-center bg-slate-50">Loading...</div>;

  if (view === 'login' || view === 'signup') {
    const isLogin = view === 'login';
    return (
      <AuthWrapper title={isLogin ? "Welcome back" : "Create an account"} subtitle="Save your work across devices.">
        <form onSubmit={handleAuthSubmit} className="space-y-5">
          {!isLogin && (
            <input type="text" placeholder="Full Name" className="w-full px-4 py-3 rounded-lg border outline-none focus:ring-2 focus:ring-orange-500" value={fullName} onChange={e => setFullName(e.target.value)} />
          )}
          <input type="email" placeholder="Email Address" className="w-full px-4 py-3 rounded-lg border outline-none focus:ring-2 focus:ring-orange-500" value={email} onChange={e => setEmail(e.target.value)} />
          <input type="password" placeholder="Password" className="w-full px-4 py-3 rounded-lg border outline-none focus:ring-2 focus:ring-orange-500" value={password} onChange={e => setPassword(e.target.value)} />
          <button type="submit" className="w-full bg-orange-600 text-white font-bold py-3 rounded-lg hover:bg-orange-700 transition-all">
            {isLogin ? "Sign In" : "Get Started"}
          </button>
        </form>
        <div className="mt-8 pt-8 border-t text-center">
          <button onClick={() => setView(isLogin ? 'signup' : 'login')} className="text-orange-600 font-semibold">{isLogin ? "Sign up for free" : "Log in"}</button>
        </div>
      </AuthWrapper>
    );
  }

  if (view === 'editor' && activePres) {
    const currentSlide = activePres.slides[currentSlideIndex];
    return (
      <div className="h-screen bg-slate-100 flex flex-col animate-in fade-in duration-300">
        <header className="bg-white border-b px-4 h-14 flex items-center justify-between z-20">
          <div className="flex items-center gap-4">
            <button onClick={() => setView('home')} className="p-2 hover:bg-slate-100 rounded-lg text-slate-500"><ChevronLeft size={20} /></button>
            <div className="flex items-center gap-2">
              <Presentation size={18} className="text-orange-600" />
              <input 
                type="text" 
                value={activePres.title} 
                onChange={(e) => {
                    const updated = {...activePres, title: e.target.value};
                    setActivePres(updated);
                    saveActivePres(updated);
                }}
                className="font-semibold text-slate-800 outline-none border-b border-transparent focus:border-orange-500 px-1"
              />
            </div>
          </div>
          <div className="flex items-center gap-3">
            <button className="bg-orange-600 text-white px-4 py-1.5 rounded-lg text-sm font-bold flex items-center gap-2"><Play size={18} /> Present</button>
          </div>
        </header>

        <div className="bg-white border-b px-4 py-2 flex items-center gap-4 z-10 shadow-sm">
          <button onClick={addSlide} className="flex flex-col items-center p-2 hover:bg-slate-100 rounded text-slate-600 group">
            <Plus size={20} /> <span className="text-[10px] font-bold text-slate-400 group-hover:text-slate-600">New Slide</span>
          </button>
          <div className="h-8 w-px bg-slate-200" />
          <button onClick={() => addElement('text')} className="flex flex-col items-center p-2 hover:bg-slate-100 rounded text-slate-600">
            <Type size={20} /> <span className="text-[10px] font-bold text-slate-400">Text</span>
          </button>
          <button onClick={() => addElement('shape')} className="flex flex-col items-center p-2 hover:bg-slate-100 rounded text-slate-600">
            <Square size={20} /> <span className="text-[10px] font-bold text-slate-400">Shape</span>
          </button>
        </div>

        <div className="flex-1 flex overflow-hidden">
          <aside className="w-48 bg-white border-r overflow-y-auto p-4 flex flex-col gap-4">
            {activePres.slides.map((slide, idx) => (
              <div 
                key={idx} 
                onClick={() => setCurrentSlideIndex(idx)}
                className={`relative cursor-pointer rounded-lg p-1 transition-all ${currentSlideIndex === idx ? 'ring-2 ring-orange-500 shadow-lg' : 'hover:bg-slate-50'}`}
              >
                <span className="absolute -left-3 top-1 text-[10px] font-bold text-slate-400">{idx + 1}</span>
                <div className="aspect-[16/9] bg-slate-50 border border-slate-200 rounded flex items-center justify-center text-[8px] text-slate-400">
                  Slide {idx + 1}
                </div>
              </div>
            ))}
          </aside>

          <main className="flex-1 bg-slate-100 p-12 flex items-center justify-center">
            <div className="w-full max-w-4xl aspect-[16/9] bg-white shadow-2xl relative border border-slate-200 overflow-hidden">
              {currentSlide.elements.map((el) => (
                <div 
                  key={el.id}
                  style={{ left: `${el.x}%`, top: `${el.y}%`, fontSize: el.fontSize ? `${el.fontSize}px` : 'inherit' }}
                  className="absolute cursor-move"
                >
                  {el.type === 'text' && (
                    <div 
                        contentEditable 
                        suppressContentEditableWarning
                        onBlur={(e) => {
                            const updated = {...activePres};
                            const element = updated.slides[currentSlideIndex].elements.find(item => item.id === el.id);
                            element.content = e.target.innerText;
                            setActivePres(updated);
                            saveActivePres(updated);
                        }}
                        className={`outline-none min-w-[50px] ${el.bold ? 'font-bold' : ''}`}
                    >
                      {el.content}
                    </div>
                  )}
                  {el.type === 'shape' && (
                    <div className="w-24 h-24 bg-orange-100 border-2 border-orange-300 rounded-md" />
                  )}
                </div>
              ))}
            </div>
          </main>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 flex">
      <aside className="w-64 bg-white border-r hidden lg:flex flex-col">
        <div className="p-6">
          <div className="flex items-center gap-2 text-orange-600 mb-8 font-bold text-xl"><Presentation size={28} /> Presently</div>
          <nav className="space-y-1">
            <button className="w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium bg-orange-50 text-orange-600"><Layout size={20} /> Home</button>
            <button className="w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium text-slate-600 hover:bg-slate-50"><Settings size={20} /> Settings</button>
          </nav>
        </div>
        <div className="mt-auto p-6 border-t flex items-center gap-3">
          <div className="h-10 w-10 bg-orange-100 text-orange-600 flex items-center justify-center rounded-full font-bold">{(fullName || 'U')[0]}</div>
          <div className="flex-1 overflow-hidden">
            <p className="text-sm font-semibold truncate">{fullName || 'User'}</p>
          </div>
          <button onClick={() => signOut(auth)} className="text-slate-400 hover:text-slate-600"><LogOut size={18} /></button>
        </div>
      </aside>

      <div className="flex-1 flex flex-col h-screen overflow-hidden">
        <header className="bg-white border-b px-8 py-4 flex items-center justify-between">
          <div className="relative w-full max-w-lg">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
            <input type="text" placeholder="Search presentations..." className="w-full pl-10 pr-4 py-2 bg-slate-100 rounded-lg text-sm outline-none" />
          </div>
          <button onClick={createNewPresentation} className="bg-orange-600 text-white px-4 py-2 rounded-lg text-sm font-bold flex items-center gap-2"><Plus size={18} /> New Slide</button>
        </header>

        <main className="flex-1 overflow-y-auto p-8">
          <div className="max-w-6xl mx-auto">
            <div className="mb-12">
              <h2 className="text-xl font-bold text-slate-800 mb-6">Start with a template</h2>
              <div onClick={createNewPresentation} className="w-48 group cursor-pointer">
                <div className="aspect-[4/3] bg-white border-2 border-dashed border-slate-200 rounded-xl flex flex-col items-center justify-center gap-2 hover:border-orange-400 hover:bg-orange-50 transition-all active:scale-95">
                  <Plus size={32} className="text-slate-400 group-hover:text-orange-600" />
                  <span className="text-xs font-semibold text-slate-500">Blank</span>
                </div>
              </div>
            </div>

            <h2 className="text-xl font-bold text-slate-800 mb-6">Your Recent Presentations</h2>
            {presentations.length === 0 ? (
              <div className="bg-white rounded-xl border p-12 flex flex-col items-center text-center shadow-sm">
                <FileText size={40} className="text-slate-200 mb-4" />
                <h3 className="text-lg font-semibold text-slate-800">No presentations yet</h3>
                <p className="text-slate-500 text-sm mb-6">Start by creating a blank presentation.</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {presentations.map(p => (
                  <div key={p.id} onClick={() => openPresentation(p)} className="bg-white border rounded-xl p-4 cursor-pointer hover:shadow-md transition-all group">
                    <div className="aspect-[16/9] bg-slate-50 rounded-lg mb-4 flex items-center justify-center text-orange-200">
                      <Presentation size={48} />
                    </div>
                    <div className="flex items-center justify-between">
                      <h3 className="font-semibold text-slate-800">{p.title}</h3>
                      <button onClick={(e) => {
                        e.stopPropagation();
                        deleteDoc(doc(db, 'artifacts', appId, 'users', user.uid, 'presentations', p.id));
                      }} className="p-1 hover:bg-red-50 text-slate-400 hover:text-red-500 rounded"><Trash2 size={16} /></button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </main>
      </div>
    </div>
  );
};

export default App;
