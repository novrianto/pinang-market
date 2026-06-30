const express = require('express');
const router = express.Router();
const { authUser } = require('../middleware/auth');
const {
  getDaftarChat, getRiwayatChat, kirimPesan, getDaftarUser
} = require('../controllers/messageController');

router.get('/daftar', authUser, getDaftarChat);
router.get('/users', authUser, getDaftarUser);
router.get('/:lawanId', authUser, getRiwayatChat);
router.post('/', authUser, kirimPesan);

module.exports = router;