import React, { useEffect, useRef, useState } from 'react';
import './App.css';

import { initializeApp } from 'firebase/app';
import { getAdditionalUserInfo, getAuth, GoogleAuthProvider, signInWithPopup, signOut } from 'firebase/auth';
import { getFirestore, collection, query, limit, orderBy, onSnapshot, addDoc, serverTimestamp, where } from 'firebase/firestore';
import { doc, getDoc, getDocs, setDoc } from 'firebase/firestore';
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
  const [regUser, setRegUser] = useState(false);  //User registered

  console.log(user);

  return (
    <div className="App">
      <header>
        <h1>End-to-End 🔒 Encrypted Chat</h1>
        <SignOut auth={auth} />
      </header>

      <section>
        {user ? (regUser ? <ChatRoom /> : <SignUp setRegUser={setRegUser} />)
          : <SignIn auth={auth} setRegUser={setRegUser} />}
      </section>

    </div>
  );
}

function SignIn({ auth, setRegUser }) {

  const signInWithGoogle = () => {
    const provider = new GoogleAuthProvider();
    signInWithPopup(auth, provider)
      .then((result) => {
        // This gives you a Google Access Token. You can use it to access the Google API.
        const credential = GoogleAuthProvider.credentialFromResult(result);
        // const token = credential.accessToken;
        // The signed-in user info.
        // const user = result.user;


        // Check for user already signed up

        const docRef = doc(firestore, "users", result.user.uid);
        getDoc(docRef).then((docSnap) => {
          if (docSnap.exists()) {
            console.log(docSnap.data());
            setRegUser(true);
          } else {
            console.log("No user exists");
            setRegUser(false);
          }
        }).catch((error) => {
          console.log(error.message);
        });

      }).catch((error) => {
        console.log(error.message);
      });
  }

  return (
    <>
      <button className="sign-in" onClick={signInWithGoogle}>Sign in with Google</button>
    </>
  )

}

function SignUp({ setRegUser }) {

  const generateKeys = () => {
    return "dummykey";
  }

  const regUser = async () => {

    const pubKey = generateKeys();

    await setDoc(doc(firestore, "users", auth.currentUser.uid), {

      displayName: auth.currentUser.displayName,
      email: auth.currentUser.email,
      photoURL: auth.currentUser.photoURL,
      pubKey: pubKey
    });

    setRegUser(true);
  }

  return (
    <>
      <button className="sign-in" onClick={regUser}>Create Keys and Register User</button>
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
  const [contacts, setContacts] = useState([]);
  const [selectedChat, setSelectedChat] = useState(null);

  const chatroomRef = collection(firestore, 'chatrooms');
  const chr_q1 = query(chatroomRef, where("uid1", "==", auth.currentUser.uid))
  const chr_q2 = query(chatroomRef, where("uid2", "==", auth.currentUser.uid))

  useEffect(() => {

    // Fetching contactList
    const chr1_unsubscribe = onSnapshot(chr_q1, (querySnapshot) => {

      const contact_ids = [];

      querySnapshot.forEach((doc) => {
        console.log(doc.id)
        contact_ids.push({
          chat_id: doc.id,
          id: doc.data().uid2
        });
      })

      const chr2_unsubscribe = onSnapshot(chr_q2, (querySnapshot2) => {
        querySnapshot2.forEach((doc) => {
          console.log(doc.id)
          contact_ids.push({
            chat_id: doc.id,
            id: doc.data().uid1
          });
        });


        const contacts_data = []
        contact_ids.map((cont, index, contact_ids) => {
          getDoc(doc(firestore, "users", cont.id)).then((docSnap) => {
            console.log(docSnap.data());
            contacts_data.push({
              chat_id: cont.chat_id,
              contact_id: cont.id,
              ...docSnap.data()
            })
            console.log(contacts_data);
            setContacts(contacts_data);
          });
        });
      });

    });

  }, []);


  return (<div className="container">
    <aside className="user-list">
      {contacts.map(cont => (
        <div id={cont.chat_id}>
          <button onClick={() => setSelectedChat(cont)}>
            <img src={cont.photoURL || 'https://api.adorable.io/avatars/23/abott@adorable.png'} /><h1>{cont.displayName} </h1>
          </button>
        </div>
      ))}
      {contacts.map(cont => (
        <div id={cont.chat_id}>
          <button onClick={() => setSelectedChat(cont)}>
            <img src={cont.photoURL || 'https://api.adorable.io/avatars/23/abott@adorable.png'} /><h1>{cont.displayName} </h1>
          </button>
        </div>
      ))}
      {contacts.map(cont => (
        <div id={cont.chat_id}>
          <button onClick={() => setSelectedChat(cont)}>
            <img src={cont.photoURL || 'https://api.adorable.io/avatars/23/abott@adorable.png'} /><h1>{cont.displayName} </h1>
          </button>
        </div>
      ))}

    </aside>

    {selectedChat == null ? null : <Chat selectedChat={selectedChat} />}

  </div>)
}

function Chat({selectedChat}) {

  const dummy = useRef();
  const [messages, setMessages] = useState([]);
  const [formValue, setFormValue] = useState('');

  const messagesRef = collection(firestore, selectedChat.chat_id);

  useEffect(() => {

    const q = query(messagesRef, orderBy("createdAt"));

    const unsubscribe = onSnapshot(q, (querySnapshot) => {
      const msgs = [];
      querySnapshot.forEach((doc) => {
        msgs.push({ ...doc.data(), id: doc.id });
      });
      console.log(msgs);
      setMessages(msgs);
      // dummy.current.scrollIntoView({ behavior: 'smooth' });
    });

  }, [])

  const sendMessage = async (e) => {
    e.preventDefault();

    const { uid } = auth.currentUser;

    await addDoc(collection(firestore, selectedChat.chat_id), {
      text: formValue,
      createdAt: serverTimestamp(),
      uid
    });

    setFormValue('');
    // dummy.current.scrollIntoView({ behavior: 'smooth' });
  }

  return (<>
    <main className="chat">

      {messages && messages.map(msg => <ChatMessage key={msg.id} message={msg} />)}

      <span ref={dummy}></span>

    </main>

    <form onSubmit={sendMessage} className="form">

      <input value={formValue} onChange={(e) => setFormValue(e.target.value)} placeholder="Type your message here" />

      <button type="submit" disabled={!formValue}>🕊️</button>

    </form>
  </>);
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
