const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const cors = require('cors');

const app = express();
app.use(cors());
app.use(express.static(__dirname));

const server = http.createServer(app);
const io = new Server(server, {
  cors: { origin: "*" }
});

let parents = [];
let children = [];

io.on('connection', (socket) => {
  console.log('تم اتصال جهاز جديد بمعرف:', socket.id);

  socket.on('register', (data) => {
    if (data.role === 'parent') {
      parents.push(socket.id);
    } else if (data.role === 'child') {
      children.push({ id: socket.id, name: data.childName || 'الطفل' });
      io.emit('child_list_updated', children);
    }
  });

  // استقبال الرسائل والتنبيهات من هاتف الطفل وإرسالها للأب
  socket.on('send_alert_to_parent', (data) => {
    console.log('تنبيه جديد من الطفل:', data);
    io.emit('new_alert_received', {
      senderName: data.childName || 'الطفل',
      message: data.message,
      type: data.type || 'normal',
      time: new Date().toLocaleTimeString('ar-EG')
    });
  });

  // توجيه أوامر التحكم من الوالدين إلى الطفل
  socket.on('parent_command', (commandData) => {
    io.to(commandData.targetChildId).emit('execute_command', commandData);
  });

  // إشارات البث الحي (WebRTC)
  socket.on('webrtc_offer', (data) => {
    io.to(data.targetId).emit('webrtc_offer', data);
  });

  socket.on('webrtc_answer', (data) => {
    io.to(data.targetId).emit('webrtc_answer', data);
  });

  socket.on('webrtc_ice_candidate', (data) => {
    io.to(data.targetId).emit('webrtc_ice_candidate', data);
  });

  socket.on('disconnect', () => {
    parents = parents.filter(id => id !== socket.id);
    children = children.filter(c => c.id !== socket.id);
    io.emit('child_list_updated', children);
  });
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  console.log(`الخادم يعمل بنجاح على المنفذ ${PORT}`);
});