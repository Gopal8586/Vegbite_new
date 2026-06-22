require('dotenv').config();
const express = require("express");
const nodemailer = require("nodemailer");
const { OAuth2Client } = require('google-auth-library');


// ==========================================
// 🔴 GOOGLE AUTH CREDENTIALS 🔴
// ==========================================
const GOOGLE_CLIENT_ID = '772189608985-qk5kjm3sfhjh3fp5h120krgrucfd1q4c.apps.googleusercontent.com';
const googleClient = new OAuth2Client(GOOGLE_CLIENT_ID);

// ==========================================
// 🔴 EMAIL CREDENTIALS 🔴
// ==========================================
const EMAIL_USER = process.env.EMAIL_USER;
const EMAIL_PASS = process.env.EMAIL_PASS;

// ==========================================
const path = require("path");
const app = express();
const hbs = require("hbs");
const async = require("hbs/lib/async");
const session = require("express-session");

require("./db/conn");
const Cart = require('./models/cartModel');
const Order = require('./models/orderModel');
const Info = require("./models/Information");
const { json } = require("express");
const port = process.env.PORT || 8998;

// all pages locations 
const static_path = path.join(__dirname, "../public");
const template_path = path.join(__dirname, "../templates/views");

// use page information using get and set use:
app.use(express.static(static_path));
app.set("view engine", "hbs");
app.set("views", template_path);

app.use(express.json());
app.use(express.urlencoded({ extended: false }));

app.use(session({
  secret: 'yourSuperSecretKeyHere',
  resave: false,
  saveUninitialized: true,
  cookie: {
    maxAge: 1000 * 60 * 60,
    secure: false
  }
}));

// Home Page Setup
app.get("/", (req, res) => {
  res.render("index");
});
app.get("/index", (req, res) => {
  res.render("index");
});

app.get("/signup", (req, res) => {
  res.render("signup");
})

// Signup page Setup

// --- GOOGLE SIGN-IN FLOW ---
app.post("/api/auth/google", async (req, res) => {
  try {
    const { credential } = req.body;

    let email, given_name, family_name, picture;

    if (GOOGLE_CLIENT_ID === 'YOUR_GOOGLE_CLIENT_ID.apps.googleusercontent.com') {
      console.log("⚠️ Skipping REAL Google Verify (Waiting for Client ID). Mocking logic.");
      const payload = JSON.parse(Buffer.from(credential.split('.')[1], 'base64').toString('utf-8'));
      email = payload.email;
      given_name = payload.given_name;
      family_name = payload.family_name;
      picture = payload.picture;
    } else {
      const ticket = await googleClient.verifyIdToken({
        idToken: credential,
        audience: GOOGLE_CLIENT_ID,
      });
      const payload = ticket.getPayload();
      email = payload.email;
      given_name = payload.given_name;
      family_name = payload.family_name;
      picture = payload.picture;
    }

    let user = await Info.findOne({ email });

    if (!user) {
      user = new Info({
        firstname: given_name,
        lastname: family_name || '',
        email: email,
        profilePic: picture
      });
      await user.save();
      console.log("✅ Auto-registered new Google user:", email);
    } else {
      // Update profile pic if it changed
      if (picture && user.profilePic !== picture) {
        user.profilePic = picture;
        await user.save();
      }
      console.log("✅ Logged in existing Google user:", email);
    }

    req.session.firstName = user.firstname;
    req.session.profilePic = user.profilePic;
    req.session.email = user.email;
    res.json({ success: true, redirectUrl: '/' });

  } catch (error) {
    console.error("Google Auth Error:", error);
    res.status(400).json({ success: false, message: "Google authentication failed." });
  }
});

// --- OTP Signup Flow ---
app.post("/api/send-otp", async (req, res) => {
  try {
    let { firstname, lastname, email, phone, password, confirmpassword } = req.body;

    if (password !== confirmpassword) {
      return res.status(400).json({ success: false, message: "Passwords do not match." });
    }

    // Sanitize phone number (remove spaces)
    phone = phone.replace(/\s+/g, '');

    const existingUser = await Info.findOne({ email });
    if (existingUser) {
      return res.status(400).json({ success: false, message: "Email already registered." });
    }

    const existingPhone = await Info.findOne({ phone: Number(phone.replace(/\D/g, '')) }).catch(() => null);
    if (existingPhone) {
      return res.status(400).json({ success: false, message: "Phone already registered." });
    }

    // Generate 6-digit OTP
    const otp = Math.floor(100000 + Math.random() * 900000).toString();

    // Store in session (expires in 10 mins)
    req.session.pendingSignup = {
      firstname, lastname, email, phone, password, confirmpassword, otp,
      expiresAt: Date.now() + 10 * 60 * 1000
    };

    // MOCK OTP SENDING (Console Fallback)
    console.log(`\n========================================`);
    console.log(`🔐 OTP GENERATED FOR NEW SIGNUP`);
    console.log(`📧 Email: ${email}`);
    console.log(`📱 Phone: ${phone}`);
    console.log(`🔑 OTP CODE: ${otp}`);
    console.log(`========================================\n`);

    // 1️⃣ Send Email via Nodemailer
    try {
      const transporter = nodemailer.createTransport({
        service: 'gmail',
        auth: { user: EMAIL_USER, pass: EMAIL_PASS }
      });

      const mailOptions = {
        from: `"VegBites" <${EMAIL_USER}>`,
        to: email,
        subject: "Your VegBites Verification Code",
        html: `
                <div style="font-family: Arial, sans-serif; text-align: center; padding: 20px;">
                    <h2>Welcome to VegBites! 🥗</h2>
                    <p>Your verification code is:</p>
                    <h1 style="font-size: 32px; color: #10b981; letter-spacing: 5px;">${otp}</h1>
                    <p>This code will expire in 10 minutes.</p>
                </div>
            `
      };

      if (EMAIL_USER !== 'YOUR_EMAIL@gmail.com') {
        await transporter.sendMail(mailOptions);
        console.log("✅ Email sent successfully");
      } else {
        console.log("⚠️ Skipping REAL Email (Waiting for API Keys)");
      }
    } catch (err) {
      console.error("❌ Email failed to send:", err.message);
      return res.status(500).json({ success: false, message: "Failed to send email." });
    }

    res.json({ success: true, message: "OTP sent successfully!" });
  } catch (error) {
    console.error("OTP send error:", error);
    res.status(500).json({ success: false, message: "Server error." });
  }
});

app.post("/api/verify-otp-and-signup", async (req, res) => {
  try {
    const otp = req.body.otp.replace(/\s+/g, '');
    const pending = req.session.pendingSignup;

    if (!pending) {
      return res.status(400).json({ success: false, message: "Session expired. Please sign up again." });
    }

    if (Date.now() > pending.expiresAt) {
      return res.status(400).json({ success: false, message: "OTP has expired." });
    }

    if (pending.otp !== otp) {
      return res.status(400).json({ success: false, message: "Invalid OTP." });
    }

    // OTP Verified! Save user.

    // Convert phone cleanly to number for MongoDB schema
    let cleanPhone = parseInt(pending.phone.replace(/\D/g, ''), 10);

    const Entries = new Info({
      firstname: pending.firstname,
      lastname: pending.lastname,
      email: pending.email,
      phone: cleanPhone,
      password: pending.password,
      cnfpassword: pending.confirmpassword,
    });

    await Entries.save();
    req.session.firstName = pending.firstname;
    req.session.email = pending.email;
    delete req.session.pendingSignup;

    res.json({ success: true, message: "Registration successful!", redirectUrl: "/" });
  } catch (error) {
    console.error("Verify OTP error:", error);
    let errorMsg = "Server error during registration.";
    if (error.code === 11000) {
      errorMsg = "Account with this Email or Phone already exists.";
    } else if (error.name === 'ValidationError') {
      errorMsg = Object.values(error.errors).map(val => val.message).join(', ');
    } else {
      errorMsg = error.message;
    }
    res.status(500).json({ success: false, message: errorMsg });
  }
});

//   Login Page Setup
app.get("/login", (req, res) => {
  res.render("login");
});

// --- FORGOT PASSWORD FLOW ---
app.get("/forgot-password", (req, res) => {
  res.render("forgot");
});

app.post("/api/forgot/send-otp", async (req, res) => {
  const { email } = req.body;
  try {
    const user = await Info.findOne({ email });
    if (!user) {
      return res.status(404).json({ success: false, message: "No account found with that email." });
    }

    // Block Google Users from rewriting password this way as they don't have passwords native to vegbites natively
    if (!user.password && user.profilePic) {
      return res.status(403).json({ success: false, message: "Please log in with 'Continue with Google' instead of resetting password." });
    }

    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    // Temporarily store in node memory or session
    req.session.resetEmail = email;
    req.session.resetOtp = otp;

    const transporter = nodemailer.createTransport({
      service: 'gmail',
      auth: { user: EMAIL_USER, pass: EMAIL_PASS }
    });

    await transporter.sendMail({
      from: `"VegBites Recovery" <${EMAIL_USER}>`,
      to: email,
      subject: 'Password Reset OTP - VegBites',
      html: `
                <div style="font-family: sans-serif; text-align: center; max-width: 500px; margin: auto; border: 1px solid #ddd; padding: 20px; border-radius: 10px;">
                    <img src="https://ui-avatars.com/api/?name=VB&background=22C55E&color=fff&rounded=true" alt="VegBites Logo" style="width: 50px;">
                    <h2>Reset Your Password</h2>
                    <p>You recently requested to reset your password for your VegBites account. Use the following OTP to complete the process:</p>
                    <div style="font-size: 32px; font-weight: bold; letter-spacing: 5px; color: #22C55E; margin: 20px 0;">${otp}</div>
                    <p style="font-size: 12px; color: #666;">If you did not request this, please ignore this email.</p>
                </div>
            `
    });

    res.json({ success: true, message: "OTP sent to email." });

  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: "Failed to send email." });
  }
});

app.post("/api/forgot/verify-otp", (req, res) => {
  const { email, otp } = req.body;
  if (req.session.resetEmail === email && req.session.resetOtp === otp) {
    res.json({ success: true, message: "OTP Verified" });
  } else {
    res.status(401).json({ success: false, message: "Invalid or expired OTP." });
  }
});

app.post("/api/forgot/reset-password", async (req, res) => {
  const { email, newPassword } = req.body;
  try {
    if (!req.session.resetEmail || req.session.resetEmail !== email) {
      return res.status(403).json({ success: false, message: "Unauthorized request." });
    }

    const user = await Info.findOne({ email });
    user.password = newPassword;
    user.cnfpassword = newPassword;
    await user.save();

    req.session.resetEmail = null;
    req.session.resetOtp = null;

    res.json({ success: true, message: "Password updated successfully." });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: "Could not update password." });
  }
});

app.post('/api/login', async (req, res) => {
  const { email, password } = req.body;

  try {
    const user = await Info.findOne({ email });

    if (!user) {
      return res.status(401).json({ success: false, message: "Account not found." });
    }

    // 🔴 Google Auth Rejection Logic 🔴
    if (!user.password) {
      return res.status(403).json({
        success: false,
        message: "You originally mapped this account exclusively with Google. Please click 'Continue with Google' below ⬇️"
      });
    }

    if (password !== user.password) {
      return res.status(401).json({ success: false, message: "Incorrect password." });
    }

    req.session.firstName = user.firstname;
    req.session.profilePic = user.profilePic;
    req.session.email = user.email;
    res.json({ success: true, redirectUrl: '/' });

  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ success: false, message: "Server error during login." });
  }
});

// Logout route
app.get('/logout', (req, res) => {
  req.session.destroy((err) => {
    if (err) {
      console.error('Error destroying session:', err);
      return res.redirect('/vegbite');
    }
    res.redirect('/index');
  });
});

// --- NEW PAGES ---
app.get("/account", async (req, res) => {
  if (!req.session.email) {
    return res.redirect("/login");
  }
  const user = await Info.findOne({ email: req.session.email });
  res.render("account", { user });
});

app.get("/orders", async (req, res) => {
  if (!req.session.email) {
    return res.redirect("/login");
  }
  try {
    const user = await Info.findOne({ email: req.session.email });
    const orders = await Order.find({ userEmail: req.session.email }).sort({ createdAt: -1 }).lean();
    
    const formattedOrders = orders.map(order => ({
      ...order,
      formattedDate: new Date(order.createdAt).toLocaleDateString('en-IN', { 
        year: 'numeric', month: 'long', day: 'numeric' 
      }),
      itemsList: order.items.map(i => `${i.quantity}x ${i.itemName}`).join(', ')
    }));

    res.render("orders", { user, orders: formattedOrders });
  } catch (err) {
    console.error("Error fetching orders:", err);
    res.render("orders", { user: null, orders: [] });
  }
});

app.post("/saveOrder", async (req, res) => {
  if (!req.session.email) {
    return res.status(401).json({ success: false, message: "Not logged in" });
  }
  
  try {
    const { items, totals } = req.body;
    const newOrder = new Order({
      userEmail: req.session.email,
      items: items.map(item => ({
        itemName: item.name,
        quantity: item.quantity,
        price: parseFloat(item.price)
      })),
      totalAmount: parseFloat(totals.grandTotal),
      status: 'Pending'
    });
    
    await newOrder.save();
    res.json({ success: true, message: "Order placed successfully" });
  } catch (error) {
    console.error("Error saving order:", error);
    res.status(500).json({ success: false, message: "Failed to place order" });
  }
});

app.get("/support", (req, res) => {
  res.render("support");
});

// Auth status API — used by menu.js to guard the cart before adding items
app.get('/api/auth-status', (req, res) => {
  if (req.session && req.session.firstName) {
    res.json({ 
      loggedIn: true, 
      name: req.session.firstName,
      profilePic: req.session.profilePic 
    });
  } else {
    res.json({ loggedIn: false });
  }
});

// Export for Vercel serverless — Vercel manages the port itself.
// When running locally (npm start / npm run dev), fall back to app.listen().
if (process.env.VERCEL) {
  module.exports = app;
} else {
  app.listen(port, () => {
    console.log(`Server running on port ${port} 🚀`);
  });
}