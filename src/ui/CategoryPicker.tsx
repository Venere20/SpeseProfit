import { useState } from 'react';
import { Pressable, Text, View } from 'react-native';
import { Category } from '../domain/model';
import { CategoryIcon, Icon } from './Icon';
import { Sheet } from './components';
import { styles } from './theme';
export function CategoryPicker({ categories, value, onChange, disabled=false, automaticLabel }: {categories:Category[];value:string;onChange:(id:string)=>void;disabled?:boolean;automaticLabel?:string}) {
  const [open,setOpen]=useState(false);const selected=categories.find(c=>c.id===value);
  return <View style={{gap:4}}><Text style={styles.label}>Categoria</Text><Pressable accessibilityRole="button" accessibilityLabel={`Categoria: ${selected?.name??automaticLabel??'Seleziona una categoria'}`} disabled={disabled} onPress={()=>setOpen(true)} style={[styles.input,styles.row]}><CategoryIcon id={value}/><Text style={[styles.text,{flex:1}]}>{selected?.name??automaticLabel??'Seleziona una categoria'}</Text><Icon name="chevron" size={18}/></Pressable>
    <Sheet visible={open} close={()=>setOpen(false)} title="Seleziona una categoria">{automaticLabel&&<Pressable accessibilityRole="radio" accessibilityState={{checked:value===''}} onPress={()=>{onChange('');setOpen(false);}} style={[styles.row,{minHeight:56}]}><Text style={styles.text}>Automatica</Text>{!value&&<Text style={styles.text}>✓</Text>}</Pressable>}{categories.map(c=><Pressable key={c.id} accessibilityRole="radio" accessibilityState={{checked:c.id===value}} onPress={()=>{onChange(c.id);setOpen(false);}} style={[styles.row,{minHeight:56}]}><CategoryIcon id={c.id}/><Text style={[styles.text,{flex:1}]}>{c.name}</Text>{c.id===value&&<Text style={styles.text}>✓</Text>}</Pressable>)}</Sheet></View>;
}
