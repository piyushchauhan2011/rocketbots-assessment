import { createRouter, createWebHistory } from 'vue-router'

const FlowView = () => import('@/views/FlowView.vue')

export const router = createRouter({
  history: createWebHistory(),
  routes: [
    { path: '/', name: 'flow', component: FlowView },
    { path: '/nodes/:nodeId', name: 'node-details', component: FlowView },
  ],
})
