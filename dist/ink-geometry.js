(function(root){
 function erase(points,circle){
  const {x,y,r}=circle,r2=r*r,parts=[];let run=[],changed=false;
  const push=p=>{const last=run[run.length-1];if(!last||Math.hypot(last[0]-p[0],last[1]-p[1])>.00001)run.push(p)};
  const finish=()=>{if(run.length)parts.push(run);run=[]};
  if(points.length===1)return (points[0][0]-x)**2+(points[0][1]-y)**2<=r2?[]:[points];
  for(let i=1;i<points.length;i++){
   const a=points[i-1],b=points[i],dx=b[0]-a[0],dy=b[1]-a[1],aa=dx*dx+dy*dy,bb=2*((a[0]-x)*dx+(a[1]-y)*dy),cc=(a[0]-x)**2+(a[1]-y)**2-r2,disc=bb*bb-4*aa*cc;
   const cuts=[0,1];if(aa>0&&disc>0){for(const t of [(-bb-Math.sqrt(disc))/(2*aa),(-bb+Math.sqrt(disc))/(2*aa)])if(t>0&&t<1)cuts.push(t)}cuts.sort((a,b)=>a-b);
   for(let j=1;j<cuts.length;j++){const lo=cuts[j-1],hi=cuts[j],mid=(lo+hi)/2,inside=(a[0]+dx*mid-x)**2+(a[1]+dy*mid-y)**2<r2;if(inside){changed=true;finish()}else{push([a[0]+dx*lo,a[1]+dy*lo]);push([a[0]+dx*hi,a[1]+dy*hi])}}
  }
  finish();return changed?parts:[points];
 }
 const api={erase};if(typeof module!=='undefined'&&module.exports)module.exports=api;else root.InkGeometry=api;
})(globalThis);
