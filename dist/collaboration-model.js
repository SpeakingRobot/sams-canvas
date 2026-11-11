/* Property-level changes preserve simultaneous edits to different cards/fields. */
(function(root){
 const copy=x=>x===undefined?undefined:JSON.parse(JSON.stringify(x));
 const collections=['nodes','edges','strokes','topics','sequences'];
 const equal=(a,b)=>JSON.stringify(a)===JSON.stringify(b);
 function fields(before,after){const props={},unset=[];for(const k of Object.keys(after))if(k!=='id'&&!equal(before[k],after[k]))props[k]=copy(after[k]);for(const k of Object.keys(before))if(k!=='id'&&!(k in after))unset.push(k);return {props,unset}}
 function diff(before,after){const ops=[],meta=fields(before.board,after.board);if(Object.keys(meta.props).length)ops.push({collection:'board',...meta});for(const collection of collections){const old=new Map(before[collection].map(x=>[x.id,x])),next=new Map(after[collection].map(x=>[x.id,x]));for(const [id,item] of next){if(!old.has(id))ops.push({collection,id,create:copy(item)});else{const change=fields(old.get(id),item);if(Object.keys(change.props).length||change.unset.length)ops.push({collection,id,...change})}}for(const id of old.keys())if(!next.has(id))ops.push({collection,id,remove:true})}return ops}
 function apply(snapshot,ops){const doc=copy(snapshot);for(const op of ops){if(op.collection==='board'){Object.assign(doc.board,op.props);continue}if(!collections.includes(op.collection))continue;const arr=doc[op.collection],i=arr.findIndex(x=>x.id===op.id);if(op.remove){if(i>=0)arr.splice(i,1)}else if(i>=0){Object.assign(arr[i],op.props);for(const key of op.unset||[])delete arr[i][key]}else if(op.create)arr.push(copy(op.create))}return doc}
 const api={diff,apply,copy,collections};if(typeof module!=='undefined'&&module.exports)module.exports=api;else root.CollaborationModel=api;
})(globalThis);
