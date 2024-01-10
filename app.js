const express = require('express');
const path  = require ('path');
const bodyParser = require('body-parser');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const cors  = require ('cors');
const app = express();

const crypto = require('crypto');
const mongoose = require('mongoose');
const Card = require ('./Models/Card');
const User = require ('./Models/User');
const schedule = require('node-schedule');

app.use(cors());
app.options('*',cors());

app.use((req, res, next) => {
    res.header('Access-Control-Allow-Origin', 'http://localhost:8082'); // Reemplaza con la URL de tu aplicación Vue.js
    res.header('Access-Control-Allow-Methods', 'GET, POST, OPTIONS, PUT, PATCH, DELETE');
    res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept');
    next();
  });
  
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({extended : false}));

app.use(express.static(path.join(__dirname, 'public')));
const PORT = process.env.PORT || 3000;

const uri = `mongodb+srv://adrianrondan:Asimilasion2023.@cluster0.s3ohch5.mongodb.net/Prueba_Culqi?retryWrites=true&w=majority`;

mongoose.connect(uri, { useNewUrlParser: true, useUnifiedTopology: true })
  .then(()=> console.log('conectado a mongodb')) 
  .catch(e => console.log('error de conexión', e))

//  eliminar tokens vencidos
const eliminarTokensVencidos = schedule.scheduleJob('*/15 * * * *', async () => {
    try {
      //  tokens vencidos
      await Card.deleteMany({ expirationTime: { $lte: new Date() } });
      console.log('Tokens vencidos eliminados');
    } catch (error) {
      console.error('Error al eliminar tokens vencidos:', error);
    }
  });

  

// LUHN
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
  
  //  registro de usuarios
app.post('/registro', async (req, res) => {
    try {
      const { username, password, email } = req.body;
  
      
      const existingUser = await User.findOne({ username });
      if (existingUser) {
        return res.status(400).json({ error: 'El nombre de usuario ya está en uso' });
      }
  
      // Create  usuario
      const newUser = new User({
        username,
        password, 
        email,
      });
  
      // Guarda  base de datos
      await newUser.save();
  
      res.json({ message: 'Usuario registrado con éxito' });
    } catch (error) {
      console.error(error);
      res.status(500).json({ error: 'Error interno del servidor' });
    }
  });

  //  tokenizar una tarjeta y asociarla a un usuario
  app.post('/tokenizar', async (req, res) => {
    try {
      const { username, cardNumber, expirationMonth, expirationYear, cvv, email } = req.body;
  
      // Validaciones
      const user = await User.findOne({ username });
      if (!user) {
        return res.status(400).json({ error: 'Usuario no encontrado' });
      }
  
      if (
        typeof cardNumber !== 'string' ||
        !luhnCheck(cardNumber) ||
        !Number.isInteger(cvv) ||
        (cvv < 100 || cvv > 9999) ||
        typeof expirationMonth !== 'string' ||
        !(expirationMonth.length === 1 || expirationMonth.length === 2) ||
        typeof expirationYear !== 'string' ||
        expirationYear.length !== 4 ||
        new Date().getFullYear() > parseInt(expirationYear, 10) + 5 ||
        typeof email !== 'string' ||
        !(email.length >= 5 && email.length <= 100) ||
        !["gmail.com", "hotmail.com", "yahoo.es"].includes(email.split('@')[1])
      ) 
      {
        const errors = [];
      
        if (typeof cardNumber !== 'string' || !luhnCheck(cardNumber)) {
          errors.push('Número de tarjeta inválido');
        }
      
        if (!Number.isInteger(cvv) || cvv < 100 || cvv > 9999) {
          errors.push('CVV inválido');
        }
      
        if (typeof expirationMonth !== 'string' || !(expirationMonth.length === 1 || expirationMonth.length === 2)) {
          errors.push('Mes de expiración inválido');
        }
      
        if (typeof expirationYear !== 'string' || expirationYear.length !== 4 || new Date().getFullYear() > parseInt(expirationYear, 10) + 5) {
          errors.push('Año de expiración inválido');
        }
      
        if (typeof email !== 'string' || !(email.length >= 5 && email.length <= 100) || !["gmail.com", "hotmail.com", "yahoo.es"].includes(email.split('@')[1])) {
          errors.push('Correo electrónico inválido');
        }
      
        return res.status(400).json({ error: 'Datos de tarjeta inválidos', errors });
      }

  
      const randomChars = crypto.randomBytes(8).toString('hex').slice(0, 16);
     const token = randomChars;




      //  la fecha de expiración (15 min)
      const expirationTime = new Date();
      expirationTime.setMinutes(expirationTime.getMinutes() + 15);
  
      //  datos en MongoDB
      const card = new Card({
        user: user._id,
        cardNumber,
        expirationMonth,
        expirationYear,
        cvv,
        email,
        token,
        expirationTime : expirationTime,
      });
  
      await card.save();
  
      res.json({ token });
    } catch (error) {
      console.error('Errrrroooor en tokenizacion',error);
      res.status(500).json({ error: 'Error interno del servidor' });
    }
  });

//  obtener el listado asociada a un token
app.get('/informacion/:token', async (req, res) => {
    const { token } = req.params;
  
    try {
      // Buscar  usando el token
      const informacion = await Card.findOne({ token });
  
      if (!informacion) {
        return res.status(404).json({ mensaje: 'No se encontró información asociada al token proporcionado.' });
      }

      const ahora = new Date();
        if (ahora > informacion.expirationTime) {
      // El token ha expirado
      return res.status(401).json({ mensaje: 'Token expirado' });
    }
      // Retornar la información 
      res.json({
        usuario: informacion.user,
        mail: informacion.email,
        tarjeta: informacion.cardNumber,
        cvv: informacion.cvv,
        anioExpiracion: informacion.expirationTime
      });
    } catch (error) {
      console.error(error);
      res.status(500).json({ mensaje: 'Error interno del servidor.' });
    }
  });

  //Inicio de sesion
  app.post('/login', async (req, res) => {
    try {
      const { username, password } = req.body;
  
      const user = await User.findOne({ username });
  
      if (!user) {
        return res.status(401).json({ error: 'Credenciales inválidas' });
      }
  
      const passwordMatch = await bcrypt.compare(password, user.password);
  
      if (!passwordMatch) {
        return res.status(401).json({ error: 'Credenciales inválidas' });
      }
  
      // Genera un token de sesión
      //const token = jwt.sign({ userId: user._id, username: user.username }, 'secreto', { expiresIn: '1h' });
        const randomChars = crypto.randomBytes(8).toString('hex').slice(0, 16);
        const token = 'pk_test_' + randomChars;
        
      res.json({ token });
    } catch (error) {
      console.error(error);
      res.status(500).json({ error: 'Error interno del servidor' });
    }
  });

app.listen(PORT, ()=>{
    console.log(`Servidor en ejecución en http://localhost:${PORT}`);
})