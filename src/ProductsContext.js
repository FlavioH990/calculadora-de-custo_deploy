import React, { createContext, useContext, useEffect, useState } from "react";
import { collection, addDoc, updateDoc, deleteDoc, doc, onSnapshot, query, where } from "firebase/firestore";
import { db } from "./firebase";
import { useAuth } from "./AuthContext";

const ProductsContext = createContext();

export const ProductsProvider = ({ children }) => {
  const { user } = useAuth();
  const [products, setProducts] = useState([]);

  useEffect(() => {
    if (!user) {
      setProducts([]);
      return;
    }

    const q = query(collection(db, "products"), where("userId", "==", user.uid));
    const unsubscribe = onSnapshot(q, (querySnapshot) => {
      const prods = [];
      querySnapshot.forEach((doc) => {
        prods.push({ id: doc.id, ...doc.data() });
      });

      // Ordena os produtos do mais recente para o mais antigo
      prods.sort((a, b) => {
        const dateA = a.createdAt?.toDate ? a.createdAt.toDate() : new Date(a.createdAt);
        const dateB = b.createdAt?.toDate ? b.createdAt.toDate() : new Date(b.createdAt);
        return dateB - dateA;
      });

      setProducts(prods);
    });

    return () => unsubscribe();
  }, [user]);

  const addProduct = async (product) => {
    if (!user) throw new Error("Usuário não autenticado");
    await addDoc(collection(db, "products"), {
      ...product,
      userId: user.uid,
      createdAt: new Date(),
    });
  };

  const updateProduct = async (id, product) => {
    if (!user) throw new Error("Usuário não autenticado");
    const productRef = doc(db, "products", id);
    await updateDoc(productRef, {
      ...product,
      updatedAt: new Date(),
    });
  };

  const deleteProduct = async (id) => {
    if (!user) throw new Error("Usuário não autenticado");
    const productRef = doc(db, "products", id);
    await deleteDoc(productRef);
  };

  return (
    <ProductsContext.Provider value={{ products, addProduct, updateProduct, deleteProduct }}>
      {children}
    </ProductsContext.Provider>
  );
};

export const useProducts = () => useContext(ProductsContext);
