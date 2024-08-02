const { initializeApp } = require("firebase/app");
const {
  getAuth,
  signInWithEmailAndPassword,
  signOut,
} = require("firebase/auth");
const {
  getStorage,
  ref,
  uploadBytes,
  uploadBytesResumable,
  getDownloadURL,
} = require("firebase/storage");

const firebaseConfig = {
  apiKey: process.env.apiKey,
  authDomain: process.env.authDomain,
  projectId: process.env.projectId,
  storageBucket: process.env.storageBucket,
  messagingSenderId: process.env.messagingSenderId,
  appId: process.env.appId,
};

const app = initializeApp(firebaseConfig);

const auth = getAuth();
const storage = getStorage(app);

exports.uploadFileToFb = async ({ path, blobFile, metadata }) => {
  const userCredential = await signInWithEmailAndPassword(
    auth,
    process.env.FB_USER,
    process.env.FB_PWF
  );

  const user = userCredential.user;
  let downloadLink;
  if (user) {
    // Create a storage reference from our storage service
    const pathRef = ref(storage, path);

    await uploadBytes(pathRef, blobFile, metadata);
    downloadLink = await getDownloadURL(pathRef);
  }
  await signOut(auth);
  return downloadLink;
};
