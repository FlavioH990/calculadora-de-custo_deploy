import React, { createContext, useContext, useEffect, useState } from "react";
import { db, auth } from "./firebase";
import { collection, query, where, onSnapshot } from "firebase/firestore";
import { onAuthStateChanged } from "firebase/auth";

const MaterialsContext = createContext();

export function MaterialsProvider({ children }) {
  const [materials, setMaterials] = useState([]);
  const [user, setUser] = useState(null);

  useEffect(() => {
    // Monitorar login do usuário
    const unsubscribeAuth = onAuthStateChanged(auth, (user) => {
      setUser(user);
    });
    return () => unsubscribeAuth();
  }, []);

  useEffect(() => {
    if (!user) {
      setMaterials([]);
      return;
    }
    // Query para buscar materiais do usuário logado
    const q = query(collection(db, "materials"), where("uid", "==", user.uid));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const mats = snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
      console.log("Materiais carregados do Firestore:", mats); // Debug
      setMaterials(mats);
    });

    return () => unsubscribe();
  }, [user]);

  return (
    <MaterialsContext.Provider value={{ materials, setMaterials }}>
      {children}
    </MaterialsContext.Provider>
  );
}

export function useMaterials() {
  return useContext(MaterialsContext);
}
