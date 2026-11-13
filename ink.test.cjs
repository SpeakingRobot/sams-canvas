const assert=require('node:assert/strict'),{erase}=require('./dist/ink-geometry.js');
const line=[[0,0],[100,0]];
assert.deepEqual(erase(line,{x:50,y:0,r:10}),[[[0,0],[40,0]],[[60,0],[100,0]]]);
assert.equal(erase(line,{x:50,y:100,r:10})[0],line,'Untouched paths retain their identity');
assert.deepEqual(erase(line,{x:50,y:0,r:200}),[],'A path fully inside the eraser is removed');
assert.deepEqual(erase([[5,5]],{x:5,y:5,r:2}),[]);
const loop=[[0,0],[100,0],[100,100],[0,100],[0,0]],pieces=erase(loop,{x:50,y:0,r:10});
assert.equal(pieces.length,2);assert.deepEqual(pieces[1].slice(-3),[[100,100],[0,100],[0,0]]);
assert.deepEqual(line,[[0,0],[100,0]],'Erasing must not mutate the source used by Undo');
console.log('Eraser geometry: partial cuts, untouched paths, full removal, loops, and Undo source integrity passed.');

{
 const vm=require('node:vm'),fs=require('node:fs');let queued=0,callback,painted=0;const stroke={points:[[0,0]]};const context={WeakMap,requestAnimationFrame:fn=>{queued++;callback=fn;return 1},board:()=>({strokes:[stroke]})};vm.createContext(context);vm.runInContext(fs.readFileSync('dist/ink-tools.js','utf8'),context);context.InkTools.paintStroke=s=>{painted=s.points.length};for(let i=0;i<1000;i++){stroke.points.push([i,i]);context.InkTools.queueStroke(stroke)}assert.equal(queued,1,'Ink DOM work must be limited to one scheduled frame');callback();assert.equal(painted,1001,'Frame batching must retain every captured point');console.log('Pen rendering: one frame for 1,000 updates with no dropped points passed.');
}
