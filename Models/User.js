const mongoose = require('mongoose');
const bcrypt = require('bcrypt');

const userSchema = new mongoose.Schema({
  username: {
    type: String,
    required: [true, 'Nombre de usuario es obligatorio'],
    unique: true,
    minlength: [5, 'El nombre de usuario debe tener al menos 5 caracteres'],
    maxlength: [100, 'El nombre de usuario no puede tener más de 100 caracteres'],
  },
  password: {
    type: String,
    required: [true, 'Contraseña es obligatoria'],
  },
  email: {
    type: String,
    required: [true, 'Correo electrónico es obligatorio'],
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
  cards: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Card' }],
});

//Encriptar
userSchema.pre('save', async function(next) {
    const user = this;
    if (!user.isModified('password')) return next();
  
    const hashedPassword = await bcrypt.hash(user.password, 10);
    user.password = hashedPassword;
    next();
  });

const User = mongoose.model('User', userSchema);

module.exports = User;
