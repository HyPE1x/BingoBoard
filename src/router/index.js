import { createRouter, createWebHistory } from 'vue-router'

import Home from '../views/Home.vue'
import Room from '../views/Room.vue'
import JoinRoom from '../views/JoinRoom.vue'

const routes = [
    { path: '/', name: 'Home', component: Home },
    { path: '/join/:roomId', name: 'JoinRoom', component: JoinRoom},
    { path: '/room/:roomId', name: 'Room', component: Room},
]

export default createRouter({
  history: createWebHistory(),
  routes
})