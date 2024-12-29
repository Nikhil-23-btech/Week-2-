const express = require('express');
const bodyParser = require('body-parser');
const nodemailer = require('nodemailer');
const crypto = require('crypto');
const mongoose = require('mongoose');
const bcrypt = require('bcrypt');
const path = require('path');
const app = express();
const port = 6000;

app.use(bodyParser.json());
app.use(express.static('public'));

let otpStore = {};

const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: 'clginternshipacc@gmail.com',
    pass: 'asrn pwxu jile azwt',
  }
});

function generateOTP() {
  return crypto.randomInt(100000, 999999).toString();
}
mongoose.connect('mongodb://localhost:27017/internsignup', {
}).then(() => {
  console.log('Connected to MongoDB');
}).catch(err => {
  console.error('Error connecting to MongoDB:', err);
});

const userSchema = new mongoose.Schema({
  firstName: { type: String, required: true },
  lastName: { type: String, required: true },
  mobileNumber: { type: String, required: true },
  email: { type: String, required: true, unique: true },
  password: { type: String, required: true }
});

const User = mongoose.model('User', userSchema);

app.post('/send-otp', async (req, res) => {
  const { email, password } = req.body;

  // Validate email format
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(email)) {
    return res.status(400).send('Invalid email format.');
  }

  // Check if email and password are provided
  if (!email || !password) {
    return res.status(400).send('Email and password are required.');
  }

  // Check if user exists and password is correct
  const user = await User.findOne({ email });
  if (!user || !user.password) {
    console.log('User not found or password is undefined');
    return res.status(401).send('Incorrect email or password.');
  }

  console.log('User found:', user);
  const passwordMatch = await bcrypt.compare(password.toString(), user.password.toString());
  if (!passwordMatch) {
    console.log('Password mismatch');
    return res.status(401).send('Incorrect email or password.');
  }

  console.log('Password match');

  const otp = generateOTP();
  otpStore[email] = otp;

  const mailOptions = {
    from: 'clginternshipacc@gmail.com',
    to: email,
    subject: 'Your OTP Code',
    text: `Your OTP code is ${otp}`
  };

  transporter.sendMail(mailOptions, (error, info) => {
    if (error) {
      console.error('Error sending email:', error);
      res.status(500).send('Failed to send OTP. Please try again.');
    } else {
      console.log('Email sent:', info.response);
      res.send('OTP sent successfully.');
    }
  });
});

app.post('/verify-otp', (req, res) => {
  const { email, otp } = req.body;
  if (otpStore[email] === otp) {
    delete otpStore[email];
    res.send('OTP verified successfully. You can proceed to login');
  } else {
    res.status(400).send('Invalid OTP. Please try again.');
  }
});

app.post('/register', async (req, res) => {
  const { firstName, lastName, mobileNumber, email, password } = req.body;

  // Validate email format
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(email)) {
    return res.status(400).send('Invalid email format.');
  }

  // Validate password length
  if (password.length < 6) {
    return res.status(400).send('Password must be at least 6 characters long.');
  }

  // Check if user already exists
  const existingUser = await User.findOne({ email });
  if (existingUser) {
    return res.status(409).send('User already exists.');
  }

  try {
    const hashedPassword = await bcrypt.hash(password, 10);
    const newUser = new User({ firstName, lastName, mobileNumber, email, password: hashedPassword });
    await newUser.save();
    res.status(201).send('User registered successfully');
  } catch (error) {
    console.error('Error registering user:', error);
    res.status(500).send('Failed to register user. Please try again.');
  }
});

app.post('/login', async (req, res) => {
  const { email, password } = req.body;

  // Validate email format
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(email)) {
    return res.status(400).send('Invalid email format.');
  }

  try {
    const user = await User.findOne({ email });
    if (!user) {
      return res.status(401).send('Incorrect email or password.');
    }

    const passwordMatch = await bcrypt.compare(password, user.password);
    if (!passwordMatch) {
      return res.status(401).send('Incorrect email or password.');
    }

    console.log(res.json({ userId: user._id }));
  } catch (error) {
    res.status(500).send('Failed to login. Please try again.');
  }
});

const handleLogin = async (e) => {
  e.preventDefault();
  const response = await fetch('/login', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ email, password }),
  });

  if (response.ok) {
    const data = await response.json();
    console.log('userId:', data.userId); 
    localStorage.setItem('userId', data.userId); 
    alert('Login successful!');
    navigate('/sample');
  } else {
    alert('Login failed. Please try again.');
  }
};

app.listen(port, () => {
  console.log(`Server running at http://localhost:${port}`);
});
