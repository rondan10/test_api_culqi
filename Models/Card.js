const mongoose = require('mongoose');

const cardSchema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  cardNumber: {
    type: String,
    validate: {
      validator: function (value) {
        return /^\d{16}$/.test(value);
      },
      message: 'Número de tarjeta no válido',
    },
    required: [true, 'Número de tarjeta es obligatorio'],
  },
  expirationMonth: {
    type: String,
    validate: {
      validator: function (value) {
        return /^(0[1-9]|1[0-2])$/.test(value);
      },
      message: 'Mes de expiración no válido',
    },
    required: [true, 'Mes de expiración es obligatorio'],
  },
  expirationYear: {
    type: String,
    validate: {
      validator: function (value) {
        return /^[0-9]{4}$/.test(value) && new Date().getFullYear() <= parseInt(value, 10) + 5;
      },
      message: 'Año de expiración no válido',
    },
    required: [true, 'Año de expiración es obligatorio'],
  },
  cvv: {
    type: Number,
    validate: {
      validator: function (value) {
        return /^[0-9]{3,4}$/.test(value);
      },
      message: 'CVV no válido',
    },
    required: [true, 'CVV es obligatorio'],
  },
  email: {
    type: String,
    validate: {
      validator: function (value) {
        return /^[a-zA-Z0-9._-]+@[gmail|hotmail|yahoo]+\.[a-zA-Z]{2,6}$/.test(value);
      },
      message: 'Correo electrónico no válido o dominio no permitido',
    },
    required: [true, 'Correo electrónico es obligatorio'],
  },
  token: {
    type: String,
    required: [true, 'Token es obligatorio'],
  },
  expirationTime: {
    type: Date,
    required: [true, 'Fecha de expiración es obligatoria'],
  },
});

//  validar Luhn
function luhnCheck(cardNumber) {
  let sum = 0;
  let isEven = false;

  for (let i = cardNumber.length - 1; i >= 0; i--) {
    let digit = parseInt(cardNumber[i], 10);

    if (isEven) {
      digit *= 2;
      if (digit > 9) {
        digit -= 9;
      }
    }

    sum += digit;
    isEven = !isEven;
  }

  return sum % 10 === 0;
}

const Card = mongoose.model('Card', cardSchema);

module.exports = Card;

