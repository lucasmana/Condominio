import express from 'express';

const router = express.Router();

// Exemplo de rota para moradores
router.get('/moradores', (req, res) => {
  res.json({ message: 'Lista de moradores' });
});

// Exemplo de rota para áreas comuns
router.get('/areas-comuns', (req, res) => {
  res.json({ message: 'Lista de áreas comuns' });
});

// Exemplo de rota para reservas
router.get('/reservas', (req, res) => {
  res.json({ message: 'Lista de reservas' });
});

export default router;
