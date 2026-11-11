import { assertCents, categoryFor } from './ledger';
import { Category, ExpenseTemplate, LedgerState, WidgetShortcut } from './model';
export function validateShortcuts(raw:unknown,categories:Category[]):WidgetShortcut[] {
  if(!Array.isArray(raw)||raw.length!==3)throw new Error('Configura tre scorciatoie.');
  return raw.map(value=>{
    if(!value||typeof value!=='object')throw new Error('Scorciatoia non valida.');
    const s=value as WidgetShortcut;
    if(!['category','frequent'].includes(s.type)||typeof s.label!=='string'||!s.label.trim()||s.label.trim().length>40||typeof s.description!=='string'||s.description.length>200||!['card','cash'].includes(s.origin)||!categories.some(c=>c.id===s.categoryId&&c.kind==='expense'))throw new Error('Controlla nome, categoria e descrizione della scorciatoia.');
    if(s.cents!==undefined)assertCents(s.cents,false);
    return {type:s.type,label:s.label.trim(),categoryId:s.categoryId,description:s.description.trim(),origin:s.origin,...(s.cents!==undefined?{cents:s.cents}:{})};
  });
}
export function shortcutFromTemplate(state:LedgerState,model:ExpenseTemplate):WidgetShortcut {
  const categoryId=model.categoryId||categoryFor(state,model.description,-model.cents);
  return {type:'frequent',label:model.description.slice(0,40),categoryId,description:model.description,origin:model.origin,cents:model.cents};
}
export function shortcutsFor(state:LedgerState):WidgetShortcut[] {
  if(state.widgetShortcuts)return state.widgetShortcuts.map(s=>({...s}));
  return ['food','transport','shopping'].map((id,index)=>{
    const model=state.expenseTemplates?.find(t=>t.id===state.widgetSlots?.[index]);
    if(model)return shortcutFromTemplate(state,model);
    const category=state.categories.find(c=>c.id===id)??state.categories.find(c=>c.kind==='expense')!;
    return {type:'category',label:category.name,categoryId:category.id,description:'',origin:'card'};
  });
}
