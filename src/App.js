import React, { useEffect, useRef, useState } from 'react';
import './App.css';

import { initializeApp } from 'firebase/app';
import { getAuth, GoogleAuthProvider, signInWithPopup, signOut } from 'firebase/auth';
import { getFirestore, collection, query, limit, orderBy, onSnapshot, addDoc, serverTimestamp } from 'firebase/firestore';
import { useAuthState } from 'react-firebase-hooks/auth';

const firebaseConfig = {
  // your config
  apiKey: "AIzaSyCWZEJsKrBPGRKJ0XSM7rq0f4lQnLEGJzQ",
  authDomain: "e2ee-chat-68065.firebaseapp.com",
  projectId: "e2ee-chat-68065",
  storageBucket: "e2ee-chat-68065.appspot.com",
  messagingSenderId: "805804732090",
  appId: "1:805804732090:web:2e8771fd376f74fb3e5c83",
  measurementId: "G-Q54G0GWPZ0"
};

const app = initializeApp(firebaseConfig);
const firestore = getFirestore();

const auth = getAuth();

function App() {

  const [user] = useAuthState(auth);

  return (
    <div className="App">
      <header>
        <h1>End-to-End 🔒 Encrypted Chat</h1>
        <SignOut auth={auth} />
      </header>

      <section>
        {user ? <ChatRoom /> : <SignIn auth={auth} />}
      </section>

    </div>
  );
}

function SignIn({ auth }) {

  const signInWithGoogle = () => {
    const provider = new GoogleAuthProvider();
    signInWithPopup(auth, provider)
      .then((result) => {
        // This gives you a Google Access Token. You can use it to access the Google API.
        const credential = GoogleAuthProvider.credentialFromResult(result);
        // const token = credential.accessToken;
        // The signed-in user info.
        // const user = result.user;
        // ...
      }).catch((error) => {
        // Handle Errors here.
        const errorCode = error.code;
        const errorMessage = error.message;

        console.log(errorCode, errorMessage);
      });
  }

  return (
    <>
      <button className="sign-in" onClick={signInWithGoogle}>Sign in with Google</button>
    </>
  )

}

function SignOut({ auth }) {
  const initiateSignOut = () => {
    signOut(auth).then(() => {
      console.log('Sign Out Success');
    }).catch((error) => {
      console.log(error);
    })
  }
  return auth.currentUser && (
    <button className="sign-out" onClick={initiateSignOut}>Sign Out</button>
  )
}


function ChatRoom() {
  console.log('ChatRoom');
  const dummy = useRef();
  const messagesRef = collection(firestore, 'messages');
  const q = query(messagesRef, orderBy("createdAt"), limit(25));

  const [messages, setMessages] = useState([]);

  useEffect(() => {
    const unsubscribe = onSnapshot(q, (querySnapshot) => {
      const msgs = [];
      querySnapshot.forEach((doc) => {
        msgs.push({ ...doc.data(), id: doc.id });
      });
      setMessages(msgs);
      dummy.current.scrollIntoView({ behavior: 'smooth' });
    });
  }, []);


  const [formValue, setFormValue] = useState('');

  const sendMessage = async (e) => {
    e.preventDefault();

    const { uid, photoURL } = auth.currentUser;

    await addDoc(messagesRef, {
      text: formValue,
      createdAt: serverTimestamp(),
      uid,
      photoURL
    });

    setFormValue('');
    dummy.current.scrollIntoView({ behavior: 'smooth' });
  }

  return (<>
    <main>

      {messages && messages.map(msg => <ChatMessage key={msg.id} message={msg} />)}

      <span ref={dummy}></span>

    </main>

    <form onSubmit={sendMessage}>

      <input value={formValue} onChange={(e) => setFormValue(e.target.value)} placeholder="Type your message here" />

      <button type="submit" disabled={!formValue}>🕊️</button>

    </form>
  </>)
}


function ChatMessage(props) {
  const { text, uid, photoURL } = props.message;

  const messageClass = uid === auth.currentUser.uid ? 'sent' : 'received';

  return (<>
    <div className={`message ${messageClass}`}>
      <img src={photoURL || 'https://api.adorable.io/avatars/23/abott@adorable.png'} />
      <p>{text}</p>
    </div>
  </>)
}


export default App;
