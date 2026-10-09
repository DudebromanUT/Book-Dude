/* The page's fixed parts: the main area, the sheet that slides up, the confirm box, toasts, and confetti. */

import { esc, reducedMotion } from './util.js';
import { icon } from './icons.js';

export const main = document.getElementById('main');
export const sheet = document.getElementById('sheet');
export const confirmBox = document.getElementById('confirm');
const toastEl = document.getElementById('toast');
const confettiEl = document.getElementById('confetti');

const topLayer = () => (confirmBox.open ? confirmBox : sheet.open ? sheet : document.body);
let toastTimer = 0;
export function toast(message) {
  topLayer().appendChild(toastEl);
  toastEl.textContent = message;
  toastEl.classList.add('show');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => toastEl.classList.remove('show'), 3200);
}

export function celebrate() {
  if (reducedMotion()) return;
  topLayer().appendChild(confettiEl);
  const colors = ['#E8654A', '#F2B441', '#2E8380', '#7A58A8', '#4F8FC0', '#E58B9C', '#9DB88E'];
  for (let i = 0; i < 44; i++) {
    const bit = document.createElement('i');
    bit.style.left = (Math.random() * 100) + 'vw';
    bit.style.background = colors[i % colors.length];
    bit.style.setProperty('--x', (Math.random() * 180 - 90) + 'px');
    bit.style.setProperty('--r', (Math.random() * 900 - 450) + 'deg');
    bit.style.setProperty('--d', (1.2 + Math.random()) + 's');
    bit.style.animationDelay = (Math.random() * 0.3) + 's';
    confettiEl.appendChild(bit);
  }
  setTimeout(() => confettiEl.replaceChildren(), 2800);
}

export function sheetBar(title) {
  return '<div class="sheet-bar"><span class="grab" aria-hidden="true"></span><p class="visually-hidden" id="sheet-title">' + esc(title) + '</p>' +
    '<span></span><button type="button" class="icon-btn" data-act="close-sheet" aria-label="Close">' + icon('x') + '</button></div>';
}

export function closeSheet() {
  if (sheet.open) sheet.close();
}

export function showConfirm(title, bodyHtml, okLabel, onOk) {
  confirmBox.innerHTML = '<div class="sheet-bar"><span class="grab" aria-hidden="true"></span><h2 id="confirm-title">' + esc(title) + '</h2>' +
    '<button type="button" class="icon-btn" data-act="close-confirm" aria-label="Close">' + icon('x') + '</button></div>' +
    '<div class="confirm-body">' + bodyHtml + '<div class="row-actions">' +
    (okLabel ? '<button type="button" class="btn primary" data-act="confirm-ok">' + esc(okLabel) + '</button><button type="button" class="btn" data-act="close-confirm">Cancel</button>' : '<button type="button" class="btn primary" data-act="close-confirm">OK</button>') +
    '</div></div>';
  confirmBox.onOk = onOk || null;
  confirmBox.showModal();
}

export const actions = {
  'close-sheet': closeSheet,
  'close-confirm': () => confirmBox.close(),
  'confirm-ok': () => { const fn = confirmBox.onOk; confirmBox.close(); if (fn) fn(); }
};
