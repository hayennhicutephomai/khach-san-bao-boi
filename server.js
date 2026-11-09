const express=require('express');
const http=require('http');
const {Server}=require('socket.io');
const app=express(),server=http.createServer(app),io=new Server(server);
app.use(express.static('public'));
const hotels=new Map();
const clean=s=>String(s||'').replace(/[<>\u0000-\u001f]/g,'').trim().slice(0,60);
function hotel(code){if(!hotels.has(code))hotels.set(code,{players:{},rooms:Array.from({length:4},(_,i)=>({id:i+101,guest:null})),queue:[],money:200,next:Date.now()+5000});return hotels.get(code)}
function send(code){const h=hotels.get(code);if(h)io.to(code).emit('state',{players:h.players,rooms:h.rooms,queue:h.queue,money:h.money})}
io.on('connection',socket=>{
 let code=null;
 socket.on('join',data=>{
  if(code)return;
  code=clean(data?.code).toUpperCase().replace(/[^A-Z0-9-]/g,'').slice(0,20)||'BAOBOI';
  const h=hotel(code);
  socket.join(code);
  h.players[socket.id]={name:clean(data?.name).slice(0,20)||'Khách',x:2,y:5};
  socket.emit('welcome',{id:socket.id,code});
  io.to(code).emit('notice',h.players[socket.id].name+' đã đến khách sạn 💗');
  send(code);
 });
 socket.on('move',d=>{
  if(!code)return;
  const p=hotel(code).players[socket.id];if(!p)return;
  const dx=Number(d?.dx)||0,dy=Number(d?.dy)||0;
  if(Math.abs(dx)+Math.abs(dy)!==1)return;
  p.x=Math.max(0,Math.min(7,p.x+dx));p.y=Math.max(0,Math.min(6,p.y+dy));
  send(code);
 });
 socket.on('rent',()=>{
  if(!code)return;
  const h=hotel(code),p=h.players[socket.id];
  if(!p||Math.abs(p.x-3)+Math.abs(p.y-3)>1)return socket.emit('notice','Hãy đến gần quầy lễ tân 🛎️');
  const room=h.rooms.find(r=>!r.guest);
  if(!room)return socket.emit('notice','Hết phòng trống rồi!');
  if(!h.queue.length)return socket.emit('notice','Chưa có khách ảo đang chờ!');
  room.guest=h.queue.shift();h.money+=50;
  io.to(code).emit('notice',room.guest+' thuê phòng '+room.id+'! +50 xu');
  send(code);
 });
 socket.on('checkout',id=>{
  if(!code)return;
  const h=hotel(code),p=h.players[socket.id];
  const room=h.rooms.find(r=>r.id===Number(id));
  if(!room||!room.guest||!p)return;
  const x=([1,3,5,7])[room.id-101];
  if(Math.abs(p.x-x)+p.y>1)return socket.emit('notice','Hãy tới cửa phòng '+id);
  room.guest=null;h.money+=20;
  io.to(code).emit('notice','Phòng '+id+' đã trả phòng! +20 xu');send(code);
 });
 socket.on('chat',message=>{
  if(!code)return;
  const p=hotel(code).players[socket.id],msg=clean(message).slice(0,120);
  if(p&&msg)io.to(code).emit('chat',{name:p.name,message:msg});
 });
 socket.on('disconnect',()=>{if(!code)return;const h=hotels.get(code);if(!h)return;delete h.players[socket.id];send(code);if(!Object.keys(h.players).length)setTimeout(()=>{if(hotels.get(code)===h&&!Object.keys(h.players).length)hotels.delete(code)},600000)});
});
setInterval(()=>{for(const [code,h] of hotels){if(Date.now()<h.next)continue;h.next=Date.now()+10000;if(h.queue.length<4){h.queue.push(['Thỏ Bông 🐰','Mèo Mimi 🐱','Gấu Dâu 🧸','Cún Bông 🐶'][Math.floor(Math.random()*4)]);io.to(code).emit('notice','Có khách mới đến quầy lễ tân!')}send(code)}},2000);
server.listen(process.env.PORT||3000,'0.0.0.0',()=>console.log('Hotel online'));
