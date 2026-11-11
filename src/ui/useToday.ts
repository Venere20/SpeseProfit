import { useEffect, useState } from 'react';
import { AppState } from 'react-native';
import { romeDate } from '../domain/ledger';
export function useToday() {
  const [today,setToday]=useState(romeDate());
  useEffect(()=>{const refresh=()=>setToday(romeDate());const timer=setInterval(refresh,1000);const sub=AppState.addEventListener('change',refresh);return()=>{clearInterval(timer);sub.remove();};},[]);
  return today;
}
