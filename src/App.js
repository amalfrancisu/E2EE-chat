import React, { useEffect, useRef, useState } from 'react';
import './App_.css';

import { initializeApp } from 'firebase/app';
import { getAuth, GoogleAuthProvider, signInWithPopup, signOut } from 'firebase/auth';
import { getFirestore, collection, query, orderBy, onSnapshot, addDoc, serverTimestamp, where } from 'firebase/firestore';
import { doc, getDoc, getDocs, setDoc } from 'firebase/firestore';
import { useAuthState } from 'react-firebase-hooks/auth';

const nacl = require('tweetnacl');
const util = require('tweetnacl-util');

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

  const [secretKey, setSecretKey] = useState(null)
  console.log(user);

  return (
    <div className="App">
      <header>
        <h1>End-to-End 🔒 Encrypted Chat</h1>
        <SignOut auth={auth} setSecretKey={setSecretKey} setRegUser={setRegUser} />
      </header>

      <section>
        {user ? (regUser ? (secretKey !== null ? <ChatRoom secretKey={secretKey} /> : <LoadKey setSecretKey={setSecretKey} />)
          : <SignUp setRegUser={setRegUser} setSecretKey={setSecretKey} />)
          : <SignIn auth={auth} setRegUser={setRegUser} />}
      </section>

    </div>
  );
}

function LoadKey({ setSecretKey }) {
  const [userPwd, setUserPwd] = useState("");
  const [keyObj, setKeyObj] = useState(null)

  const updateKey = (e) => {

    let file = e.target.files[0]
    const reader = new FileReader();
    reader.readAsText(file)

    reader.addEventListener("load", () => {
      const keyData = JSON.parse(reader.result);
      setKeyObj({ ...keyData })
    });
  }

  const useKey = () => {
    const nonce = util.decodeBase64(keyObj.nonce);
    const enckeyArr = util.decodeBase64(keyObj.key);

    const keyArr = nacl.secretbox.open(enckeyArr, nonce, util.decodeUTF8(userPwd.padStart(32)));
    console.log(keyArr);

    if (keyArr == null) {
      alert("Invalid Password");
      return;
    }

    setSecretKey({ string: util.encodeBase64(keyArr), uint8: keyArr });
  }
  return (
    <div className='fileUpload' style={{ backgroundColor: "white" }}>
      <h1>Select Key file</h1><input type="file" name="keyf" accept='.json' onChange={updateKey} />
      <br /> <br />

      <input type="password" name="userpwd" id="userpwd_inp" placeholder='Password'
        value={userPwd} onChange={e => setUserPwd(e.target.value)} />
      <br /> <br />
      <button onClick={useKey}>Use Key</button>
    </div>
  )
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

function SignUp({ setRegUser, setSecretKey }) {

  const [userPwd, setUserPwd] = useState("");

  const generateKeys = () => {
    const keypair = nacl.box.keyPair()

    const publicKey = util.encodeBase64(keypair.publicKey);
    const privateKey = util.encodeBase64(keypair.secretKey);
    setSecretKey({ string: privateKey, uint8: keypair.secretKey });
    return [privateKey, publicKey];
  }

  const regUser = async () => {

    if (userPwd === "") {
      alert("Enter Password");
      return;
    }

    const [pvtKey, pubKey] = generateKeys();

    const nonce = nacl.randomBytes(nacl.box.nonceLength);
    const encPvtKey = util.encodeBase64(
      nacl.secretbox(
        util.decodeBase64(pvtKey),
        nonce,
        util.decodeUTF8(userPwd.padStart(32))
      )
    )

    const keyF = { key: encPvtKey, nonce: util.encodeBase64(nonce) };
    const blob = new Blob([JSON.stringify(keyF)], { type: 'application/json' });

    const a = document.createElement('a');
    a.download = auth.currentUser.email + '_keyFile.json';
    a.href = URL.createObjectURL(blob);

    a.addEventListener('click', (e) => {
      setTimeout(() => URL.revokeObjectURL(a.href), 30 * 1000);
    });
    a.click();

    await setDoc(doc(firestore, "users", auth.currentUser.uid), {

      displayName: auth.currentUser.displayName,
      email: auth.currentUser.email,
      photoURL: auth.currentUser.photoURL,
      pubKey: pubKey
    });

    setRegUser(true);
  }

  return (

    <div>
      <br />
      <label for="userpwd">Create Password for Private Key</label>
      <input type="password" name="userpwd" id="userpwd_inp" placeholder='Type Password'
        value={userPwd} onChange={e => setUserPwd(e.target.value)} />
      <br /> <br />
      <button className="sign-in" onClick={regUser}>Create Keys and Register User</button>
    </div>
  )
}

function SignOut({ auth, setSecretKey, setRegUser }) {
  const initiateSignOut = () => {
    signOut(auth).then(() => {
      console.log('Sign Out Success');
      setSecretKey(null);
      setRegUser(false);
    }).catch((error) => {
      console.log(error);
    })
  }
  return auth.currentUser && (
    <button className="sign-out" onClick={initiateSignOut}>Sign Out</button>
  )
}


function ChatRoom({ secretKey }) {
  console.log('ChatRoom', secretKey);
  const [contacts, setContacts] = useState([]);
  const [selectedChat, setSelectedChat] = useState(null);

  useEffect(() => {

    const chatroomRef = collection(firestore, 'chatrooms');
    const chr_q1 = query(chatroomRef, where("uid1", "==", auth.currentUser.uid))
    const chr_q2 = query(chatroomRef, where("uid2", "==", auth.currentUser.uid))

    let unsub2;

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

      unsub2 = chr2_unsubscribe;

    });

    return () => {
      chr1_unsubscribe();
      unsub2();
    }

  }, []);


  return (<div className="container">
    <aside className="user-list">
      <StartNewChat contacts={contacts}/>
      {contacts.map(cont => (
        <div id={cont.chat_id}>
          <button className='contact' onClick={() => { setSelectedChat(cont) }}>
            <img src={cont.photoURL || 'https://api.adorable.io/avatars/23/abott@adorable.png'} /><h4>{cont.displayName} </h4>
          </button>
        </div>
      ))}

    </aside>

    {selectedChat == null ? null : <Chat key={selectedChat.chat_id} selectedChat={selectedChat} secretKey={secretKey} />}

  </div>)
}

function StartNewChat({ contacts}) {
  const [searchId, setSearchId] = useState("");

  const tryNewChat = async () => {

    if (searchId === auth.currentUser.email) {
      alert("You cannot chat with yourself");
      return;
    }

    const usersRef = collection(firestore, 'users');
    const usr_qry = query(usersRef, where("email", "==", searchId));

    const qSnap = await getDocs(usr_qry);
    if (qSnap.empty) {
      alert("No user with given email id exists!")
      return;
    }

    let newContact;
    qSnap.forEach((doc)=> {
      newContact = {
        ...doc.data(),
        id: doc.id
      }
    });

    console.log(newContact);

    

    const chatroom_ids = [auth.currentUser.uid, newContact.id].sort()
    const newChat_id = chatroom_ids[0]+"-"+chatroom_ids[1];
    console.log(chatroom_ids);
    
    const chatRef = doc(firestore, "chatrooms", newChat_id);

    const chatroomSnap = await getDoc(chatRef);

    if(chatroomSnap.exists()) {
      alert("Chat already exists!")
      return;
    }

    const addRes = await setDoc(doc(firestore, "chatrooms", newChat_id), {
      uid1: chatroom_ids[0],
      uid2: chatroom_ids[1]
    });

    console.log(addRes);
  };
  
  return (
    <div>
      <input type="text" name="searchid" id="searchid" placeholder="Type new email id" size="15"
        value={searchId} onChange={e => setSearchId(e.target.value)} />
      <button className='sign-in' disabled={searchId === ""} onClick={tryNewChat}>Start New Chat</button>
    </div>
  );
}

function Chat({ selectedChat, secretKey }) {

  console.log("CHat", selectedChat);

  const dummy = useRef();
  const [messages, setMessages] = useState([]);
  const [formValue, setFormValue] = useState('');

  const messagesRef = collection(firestore, selectedChat.chat_id);

  useEffect(() => {

    const q = query(messagesRef, orderBy("createdAt"));

    console.log('Query for messages from ', selectedChat.chat_id);

    const unsubscribe = onSnapshot(q, (querySnapshot) => {
      const msgs = [];
      querySnapshot.forEach((doc) => {
        msgs.push({ ...doc.data(), id: doc.id });
      });
      console.log(msgs);
      setMessages(msgs);
      // dummy.current.scrollIntoView({ behavior: 'smooth' });

      return () => {
        console.log('Unsubscribing messages from ', selectedChat.chat_id);
        unsubscribe();
      }
    });

  }, []);

  const encryptMessage = (msg, pubKey) => {

    console.log(msg, pubKey);
    const pubKeyUint8Arr = util.decodeBase64(pubKey);
    const msgUint8Arr = util.decodeUTF8(msg);
    console.log(msgUint8Arr);
    const nonce = nacl.randomBytes(nacl.box.nonceLength);
    const encryptedMsg = nacl.box(msgUint8Arr, nonce, pubKeyUint8Arr, secretKey.uint8);
    console.log(encryptedMsg);
    console.log(util.encodeUTF8(nacl.box.open(
      util.decodeBase64(util.encodeBase64(encryptedMsg)),
      util.decodeBase64(util.encodeBase64(nonce)),
      pubKeyUint8Arr,
      secretKey.uint8
    )));
    return {
      text: util.encodeBase64(encryptedMsg),
      nonce: util.encodeBase64(nonce)
    }
  }

  const sendMessage = async (e) => {
    e.preventDefault();

    const { uid } = auth.currentUser;

    const encryption = encryptMessage(formValue, selectedChat.pubKey)

    await addDoc(collection(firestore, selectedChat.chat_id), {
      ...encryption,
      createdAt: serverTimestamp(),
      uid
    });

    setFormValue('');
    // dummy.current.scrollIntoView({ behavior: 'smooth' });
  }

  return (<>
    <main className="chat">
      <h1 className='chathead' style={{ color: "white" }}>{selectedChat.displayName}</h1>

      <div className='messages-section'>
        {messages && messages.map(msg =>
          <ChatMessage key={msg.id} message={msg} keys={{ pvt: secretKey, pub: selectedChat.pubKey }} />)}

        <span ref={dummy}></span>

      </div>

      <form onSubmit={sendMessage} className="form">

        <input value={formValue} onChange={(e) => setFormValue(e.target.value)} placeholder="Type your message here" />

        <button type="submit" disabled={!formValue}>Send</button>

      </form>
    </main>
  </>);
}

function ChatMessage(props) {
  const { text, uid, nonce } = props.message;
  const { keys } = props;
  console.log(keys, text);

  const decryptedMsgUint8 = nacl.box.open(
    util.decodeBase64(text),
    util.decodeBase64(nonce),
    util.decodeBase64(keys.pub),
    keys.pvt.uint8
  );
  console.log(decryptedMsgUint8);
  const decryptedMsg = decryptedMsgUint8 === null ? "Decryption Failed" : util.encodeUTF8(decryptedMsgUint8);

  const messageClass = uid === auth.currentUser.uid ? 'sent' : 'received';

  return (<>
    <div className={`message ${messageClass}`}>
      <p>{decryptedMsg}</p>
    </div>
  </>)
}


export default App;