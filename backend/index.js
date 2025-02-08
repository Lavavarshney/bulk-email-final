const express = require('express');
const multer = require('multer');
const csvParser = require('csv-parser');
const fs = require('fs');
const mongoose = require('mongoose');
const SibApiV3Sdk = require('sib-api-v3-sdk'); // Brevo SDK
const User = require('./models/User'); // MongoDB User model
const cors = require('cors');
const axios = require('axios'); // For tracking clicks
const { generateToken, verifyToken } = require('./login'); // Adjust the path to your JWT file
const bcrypt = require('bcryptjs');
const app = express();
const PORT = process.env.PORT || 3000;

require('dotenv').config();

const apiKey = process.env.BREVO_API_KEY;
const emailTracking = {}; // { email: { delivered: count, clicked: count } }
// Allow requests from your frontend origin
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.post('/signup', async (req, res) => {
  const { name, email, password, confirmPassword } = req.body;
  console.log(req.body); // Log the request body to debug
  if (!name || !email || !password || !confirmPassword) {
    return res.status(400).json({ message: 'Name, email, and password are required' });
  }
  if (password !== confirmPassword) {
    return res.status(400).json({ message: 'Passwords do not match' });
  }
  try {
    const existingUser  = await User.findOne({ email });
    if (existingUser ) {
      return res.status(400).json({ message: 'User  already exists' });
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    console.log("Hashed Password:", hashedPassword); // Debugging to check if hash is working correctly

    // Ensure password is stored correctly
    const newUser  = new User({ name, email, password: hashedPassword });
    await newUser .save();
    const token = generateToken(newUser );

    res.status(201).json({ message: 'User  created successfully', token });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Internal server error' });
  }
});

app.post('/login', async (req, res) => {
  const { email, password } = req.body;

  try {
    // Find user by email
    const user = await User.findOne({ email });

    if (!user) {
      return res.status(400).json({ message: 'User  not found' });
    }
    console.log('Password:', password);
    console.log('Hashed Password from DB:', user.password);
    console.log("User  from DB:", user); // Debug user data
    console.log("Password from Request:", password);
    console.log("Stored Hashed Password:", user.password);

    // Ensure user has a password before comparing
    if (!user.password) {
      return res.status(500).json({ message: 'No password stored for this user' });
    }
    // Validate password using bcrypt
    const isPasswordValid = await bcrypt.compare(password, user.password);
    if (!isPasswordValid) {
      return res.status(400).json({ message: 'Invalid password' });
    }
    // Reset session email count for the user
    // Generate JWT token
    const token = generateToken(user);

    res.json({ token, message: 'Login successful' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Internal server error' });
  }
});

// Protected route to fetch current user's details using the token
app.get('/current-user', async (req, res) => {
  const token = req.headers['authorization'];  // Assuming the token is sent in the Authorization header

  if (!token) {
    return res.status(400).json({ message: 'No token provided' });
  }

  try {
    // Verify and decode the token to extract user data
    const decoded = verifyToken(token);

    // Find the user from the database based on the decoded email (or other unique identifier)
    const user = await User.findOne({ email: decoded.email });

    if (!user) {
      return res.status(400).json({ message: 'User  not found' });
    }

    // Send the current user's data back as a response
    res.json({
      name: user.name,
      email: user.email,
    });
  } catch (error) {
    console.error(error);
    res.status(401).json({ message: 'Invalid or expired token' });
  }
});

const checkIfSenderExists = async (email) => {
  const url = 'https://api.brevo.com/v3/senders'; // Endpoint to get the list of senders

  try {
    const response = await axios.get(url, {
      headers: {
        'api-key': apiKey,
      },
    });

    // Check if the email exists in the list of senders
    return response.data.senders.some(sender => sender.email === email);
  } catch (error) {
    console.error('Error fetching senders:', error.response ? error.response.data : error.message);
    throw new Error('Failed to fetch senders');
  }
};

app.post('/add-verified-sender', async (req, res) => {
  const token = req.headers['authorization'];  // Assuming the token is sent in the Authorization header

  if (!token) {
    return res.status(400).json({ message: 'No token provided' });
  }

  try {
    // Verify the token and decode the user's email
    const decoded = verifyToken(token);
    const userEmail = decoded.email;

    if (!userEmail) {
      return res.status(400).json({ message: 'Email not found in token' });
    }
    // Check if the sender already exists
    const senderExists = await checkIfSenderExists(userEmail);
    if (senderExists) {
      return res.status(200).json({ message: 'Sender already verified, ready to send emails.' });
    }

    // Make API request to Brevo to add the sender
    const response = await axios.post(url, 
      {
        email: userEmail, 
        name: decoded.name || "Unknown"  // Adding user's name (if available)
      },
      {
        headers: {
          'Content-Type': 'application/json',
          'api-key': apiKey,
        },
      }
    );

    // Handle successful response from Brevo
    res.status(200).json({ message: 'Sender added and verified successfully', data: response.data });
    console.log("userEmail", userEmail);
  } catch (error) {
    console.error('Error adding sender:', error.response ? error.response.data : error.message);
    res.status(500).json({ message: 'Failed to add sender' });
  }
});

// Example of setting dynamic email content with a placeholder
let dynamicEmailContent = `
  <h1>Welcome, {{name}}!</h1>
  <p>Thank you for joining us. We are excited to have you!</p>
`; 

// Initialize Brevo API
const defaultClient = SibApiV3Sdk.ApiClient.instance;
const brevoApiKey = defaultClient.authentications['api-key'];
brevoApiKey.apiKey = apiKey;

const apiInstance = new SibApiV3Sdk.TransactionalEmailsApi();

// Connect to MongoDB
const mongoURI = process.env.MONGODB_URI;

mongoose.connect(mongoURI, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
})
  .then(() => console.log('Connected to MongoDB Atlas'))
  .catch((error) => console.error('Error connecting to MongoDB Atlas:', error));

// Setup multer for file upload
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, path.join(__dirname, 'uploads'));
  },
  filename: function (req, file, cb) {
    cb(null, file.originalname);
  }
});

const upload = multer({ storage: storage });

// Helper function to convert schedule time into milliseconds
const parseScheduleTime = (time) => {
  const regex = /(\d+)([smh])/; // Regex to match numbers with time units (seconds, minutes, hours)
  const match = time.match(regex);
  if (!match) return null;

  const value = parseInt(match[1], 10);
  const unit = match[2];

  let delay = 0;
  switch (unit) {
    case 's':  // seconds
      delay = value * 1000;
      break;
    case 'm':  // minutes
      delay = value * 60 * 1000;
      break;
    case 'h':  // hours
      delay = value * 60 * 60 * 1000;
      break;
    default:
      return null;
  }

  return delay;
};

// Helper function to validate email format
const isValidEmail = (email) => {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
};

// Endpoint to set dynamic email content
app.post('/send-email-content', async (req, res) => {
  const { emailContent } = req.body;

  if (emailContent) {
    dynamicEmailContent = emailContent; // Save the email content for later use
  }

  try {
    console.log('Received email content:', emailContent);
    res.status(200).json({ message: 'Email content updated successfully' });
  } catch (error) {
    console.error('Error processing email content:', error);
    res.status(500).json({ message: 'An error occurred while processing the email content.' });
  }
});

app.post('/api/track-delivery', async (req, res) => {
  const { email } = req.body;

  // Initialize totalDelivered variable
  let totalDelivered = 0;

  if (email) {
    const user = await User.findOne({ email });
    if (!user) {
      return res.status(404).json({ message: 'User  not found' });
    }
    // Check if the last email was sent recently (e.g., in the last 5 minutes)
    const now = new Date();
    const lastSentTime = user.lastEmailSentAt;
    if (!lastSentTime || now - lastSentTime > 2 * 60 * 1000) { // 5 minutes threshold
      user.emailsSent += 1;
      user.lastEmailSentAt = now; // Update last sent timestamp
      await user.save();
    }
    totalDelivered = user.emailsSent; 

    console.log(`Email delivered: ${email}, Total Delivered: ${totalDelivered}`);
  } else {
    return res.status(400).json({ message: 'Email is required' });
  }

  return res.status(200).json({ 
    message: 'Delivery tracked successfully', 
    emailsSent: totalDelivered 
  });
});

app.get('/track-open', async (req, res) => {
  const { email } = req.query;
  
  if (email) {
    try {
      const user = await User.findOne({ email });

      if (!user) {
        return res.status(404).json({ message: 'User  not found' });
      }

      user.emailsOpened += 1;
      user.lastEmailOpenedAt = new Date();
     // totalEmailsOpened = user.emailsOpened;

      await user.save();
      console.log(user.emailsOpened);
      console.log(`📩 Email opened by: ${email}, Total Opens: ${user.emailsOpened}`);

    } catch (error) {
      console.error('Error updating user:', error);
      return res.status(500).json({ message: 'Error tracking email open' });
    }
  }
  // Optionally, send a 1x1 transparent pixel image as before
  res.setHeader("Content-Type", "image/png");
  res.send(Buffer.from("iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/wcAAgAB/ep0ZoIAAAAASUVORK5CYII=", "base64"));
});

app.post('/email-opens', async (req, res) => {
  const { email } = req.body;
let totalEmailsOpened = 0;
  if (!email) {
    return res.status(400).json({ message: 'Email is required' });
  }

  try {
    const user = await User.findOne({ email });

    if (!user) {
      return res.status(404).json({ message: 'User  not found' });
    }
console.log("postive response of email opened", user.emailsOpened);
    res.status(200).json({
      email,
      totalEmailsOpened: user.emailsOpened,
      lastOpenedAt: user.lastEmailOpenedAt
    });
  } catch (error) {
    console.error('Error fetching email open count:', error);
    res.status(500).json({ message: 'Error fetching email open count' });
  }
});

app.get('/track-click', async (req, res) => {
  try {
 
    const { email, url } = req.query;
    if (!email || !url) {
      return res.status(400).send('Missing email or URL');
    }
const user = await User.findOne({ email: req.query.email });

    if (!user) {
      return res.status(404).json({ message: 'User  not found' });
    }
    // Update user's click count and last clicked time
    await User.updateOne(
      { email },
      {
        $inc: { emailsClicked: 1 }, 
        $set: { lastEmailClickedAt: new Date() }
      }
    );
  
console.log("postive response of email clicked", user.emailsClicked);
    // Redirect to the actual link
    res.redirect(url);
  } catch (error) {
    console.error('Error tracking click:', error);
    res.status(500).send('Internal Server Error');
  }
});


// Modified Unsubscribe endpoint to accept email as query parameter
app.get('/unsubscribe', async (req, res) => {
  const { email } = req.query;

  console.log('Received email:', email); // Log the email received
  if (!isValidEmail(email)) {
    return res.status(400).json({ message: 'Invalid email address' });
  }

  try {
    const user = await User.findOneAndUpdate(
      { email },
      { subscribed: false },
      { new: true }
    );

    if (!user) {
      return res.status(404).json({ message: 'User  not found' });
    }

    res.status(200).json({ message: 'You have successfully unsubscribed from our emails.' });
  } catch (error) {
    console.error('Error unsubscribing user:', error);
    res.status(500).json({ message: 'Error processing the unsubscribe request.' });
  }
});

// Helper function to send email
const sendEmailAndNotifyWebhook = async (senderName, recipientEmail, recipientName) => {
  try {
     console.log("Sending email to:", recipientEmail); 
    const trackingPixelURL = `http://bulk-email-final2.onrender.com/track-open?email=${encodeURIComponent(recipientEmail)}`;
     const trackingClickURL = `http://bulk-email-final2.onrender.com/track-click?email=${encodeURIComponent(recipientEmail)}&url=${encodeURIComponent("https://www.example.com")}`
    const personalizedEmailContent = dynamicEmailContent.replace('{{name}}', recipientName);
    const emailContentWithPixel = `${personalizedEmailContent}
      <img src="${trackingPixelURL}" alt="Tracking Pixel" width="1" height="1" style="display: none;" />;
   <p><a href="${trackingClickURL}" target="_blank">Click here</a> to visit our website.</p>`;

    const sendSmtpEmail = {
      sender: { email: "lavanya.varshney2104@gmail.com", name: senderName },
      to: [{ email: recipientEmail }],
      subject: "hello",
      htmlContent: emailContentWithPixel,
      headers: {
        'X-Tracking-Open': 'true', // Enable open tracking
        'X-Tracking-Click': 'true' // Enable click tracking (if needed)
      },
    };
    const emailResponse = await apiInstance.sendTransacEmail(sendSmtpEmail);
    console.log('Email sent:', emailResponse);
  } catch (error) {
    console.error('Error sending email ', error);
  }
};

app.post('/send-manual-emails', async (req, res) => {
  const token = req.headers['authorization'];  // Get the token from the headers
  console.log(token);
  if (!token) {
    return res.status(400).json({ message: 'No token provided' });
  }
  // Remove "Bearer " prefix if present
  const tokenWithoutBearer = token.startsWith('Bearer ') ? token.split(' ')[1] : token;
  let decoded;
  try {
    decoded = verifyToken(tokenWithoutBearer); 
    console.log(decoded); // Verify the token to get user info
  } catch (error) {
    return res.status(401).json({ message: 'Invalid or expired token' });
  }
  const { emailList, scheduleEmail, scheduleTime } = req.body; // Add scheduling options
  console.log("emailList", emailList);
  const emailContent = req.body.emailContent; // Access the email content
  console.log('Email content received:', emailContent);

  dynamicEmailContent = emailContent;

  if (!Array.isArray(emailList) || emailList.length === 0) {
    return res.status(400).json({ message: 'Invalid email list provided.' });
  }

  const validEmails = [];
  const invalidEmails = [];

  // Validate email list
  emailList.forEach(({ name, email }) => {
    if (name && email && isValidEmail(email)) {
      validEmails.push({ name: name.trim(), email: email.trim() });
    } else {
      invalidEmails.push({ name, email });
    }
  });

  if (validEmails.length === 0) {
    return res.status(400).json({ message: 'No valid emails provided.', invalidEmails });
  }
  
  // Retrieve the user instance from the database
  const user = await User.findOne({ email: decoded.email });
  if (!user) {
    return res.status(404).json({ message: 'User  not found' });
  }
  console.log("User 's emailsSent before sending: " + user.emailsSent);

  const FREE_EMAIL_LIMIT = 10;
  const BASIC_EMAIL_LIMIT = 12;
  const PREMIUM_EMAIL_LIMIT = 1000;

  // Check if the user has exceeded their plan's email limit
  if (user.planStatus === "free" && user.emailsSent >= FREE_EMAIL_LIMIT) {
    const checkoutUrl = `https://myappstore.lemonsqueezy.com/buy/45f80958-7809-49ef-8a3f-5aa75851adc3`; // Free -> Premium URL
    return res.status(402).json({
      message: 'Email limit reached. Please upgrade to Premium.',
      checkoutUrl
    });
  }

  if (user.planStatus === "basic" && user.emailsSent >= BASIC_EMAIL_LIMIT) {
    const checkoutUrl = `https://myappstore.lemonsqueezy.com/buy/2f666a6a-1ebb-4bdb-bfae-2e942ba9d12a`; // Basic -> Premium URL
    return res.status(402).json({
      message: 'You have reached the Basic plan limit (12 emails). Please upgrade to Premium.',
      checkoutUrl
    });
  }

  if (user.planStatus === "premium" && user.emailsSent >= PREMIUM_EMAIL_LIMIT) {
    const checkoutUrl = `https://myappstore.lemonsqueezy.com/buy/2f666a6a-1ebb-4bdb-bfae-2e942ba9d12a`; // Premium -> Reached Limit URL
    return res.status(402).json({
      message: 'Email limit reached. Please upgrade to a higher plan.',
      checkoutUrl
    });
  }

  try {
    // Process each valid email
    const emailPromises = validEmails.map(async ({ name, email }) => {
      // Check if user already exists in the database
      if (email !== "lavanya.varshney2104@gmail.com") {
        const existingUser  = await User.findOne({ email: email });
        if (!existingUser ) {
          // Add user to the database if they don't already exist
          const newUser  = new User({
            name: name,
            email: email,
            subscribed: true, // Assuming the user is subscribed by default
          });
          await newUser .save();
          console.log(`User  added to database: ${name}, ${email}`);
        } else {
          // Log to the console instead of alert
          throw new Error(`User  already exists: ${name}, ${email}`);
        }
      }
      if (scheduleEmail && scheduleTime) {
        // If scheduling is enabled, calculate delay and schedule the email
        const delay = parseScheduleTime(scheduleTime);
        if (delay !== null) {
          setTimeout(async () => {
            await sendEmailAndNotifyWebhook(decoded.name, email, name);
            user.emailsSent += 1; 
            await user.save(); // Save the updated user instance
            console.log("emailSent count", user.emailsSent);
            console.log(`Scheduled email sent to ${email} after ${scheduleTime}`);
          }, delay);
        } else {
          console.log(`Invalid schedule time for ${email}. Email not scheduled.`);
        }
      } else {
        // Send email immediately if no scheduling is set
        await sendEmailAndNotifyWebhook(decoded.name, email, name);
        user.emailsSent += 1; 
        await user.save(); // Save the updated user instance
        console.log("emailSent count", user.emailsSent);
      }
    });

    // Wait for all email sending tasks to complete
    await Promise.all(emailPromises);

    res.status(200).json({
      message: 'Emails sent successfully to valid recipients.',
      validEmails,
      invalidEmails,
    });
  } catch (error) {
    console.error('Error sending emails:', error);
    res.status(500).json({ message: 'Error sending emails.', error });
  }
});

// Middleware to check if email content is set
const checkEmailContent = (req, res, next) => {
  if (!dynamicEmailContent) {
    return res.status(400).json({ message: 'Email content must be set before uploading CSV.' });
  }
  next();
};

// Route to upload CSV file and create a campaign
app.post('/upload-csv', upload.single('csvFile'), async (req, res) => {
  if (!req.file) {
    return res.status(400).send('No file uploaded.');
  }

  const token = req.headers['authorization'];  // Get the token from the headers
  const tokenWithoutBearer = token.startsWith('Bearer ') ? token.split(' ')[1] : token;
  let decoded;
  try {
    decoded = verifyToken(tokenWithoutBearer); // Verify the token to get user info
  } catch (error) {
    return res.status(401).json({ message: 'Invalid or expired token' });
  }

  const emailContent = req.body.emailContent; // Access the email content
  console.log('Email content received:', emailContent);

  dynamicEmailContent = emailContent; // Set the email content
  console.log('File received:', req.file);
  const validUsers = [];
  const invalidUsers = [];
  const rows = [];
  const filePath = req.file.path; 

  fs.createReadStream(filePath)
    .pipe(csvParser({
      separator: ',',  // Specify the delimiter (comma)
      quote: '"',      // Specify the quote character
      headers: ['name', 'email'] // Explicitly define the headers
    }))
    .on('data', (row) => {
      rows.push(row);  // Collect all rows first
    })
    .on('end', async () => {
      console.log('CSV Parsing Finished');
      
      // Process each row after CSV parsing is complete
      for (const row of rows) {
        const { name, email } = row;
        const cleanedName = name ? name.trim() : '';
        const cleanedEmail = email ? email.trim() : '';

        if (!cleanedName || !cleanedEmail || !isValidEmail(cleanedEmail)) {
          console.log('Invalid data:', row);
          invalidUsers.push(row); // Store invalid users
          continue; // Skip invalid rows
        }

        try {
          // Check for duplicate email in MongoDB
          if (cleanedEmail !== "lavanya.varshney2104@gmail.com") {
            const existingUser  = await User.findOne({ email: cleanedEmail });
            if (existingUser ) {
              console.log(`Duplicate email found: ${cleanedEmail}`);
              continue; // Skip if the email already exists
            }
          
            // If no duplicate, add user to the valid array
            validUsers.push({ name: cleanedName, email: cleanedEmail });
          }
          // Schedule the email if scheduling parameters are provided
          if (req.body.scheduleEmail && req.body.scheduleTime) {
            const delay = parseScheduleTime(req.body.scheduleTime);
            if (delay !== null) {
              setTimeout(async () => {
                await sendEmailAndNotifyWebhook(decoded.name, cleanedEmail, cleanedName);
                console.log(`Scheduled email sent to ${cleanedEmail} after ${req.body.scheduleTime}`);
              }, delay);
            } else {
              console.log(`Invalid schedule time for ${cleanedEmail}. Email not scheduled.`);
            }
          } else {
            // Send email immediately if no schedule is set
            await sendEmailAndNotifyWebhook(decoded.name, cleanedEmail, cleanedName);
          }
          
        } catch (error) {
          console.error('Error processing user:', error);
        }
      }

      // After processing, save valid users to MongoDB
      try {
        if (validUsers.length > 0) {
          await User.insertMany(validUsers);
          console.log('Users successfully added to the database!');
          res.status(200).json({
            message: 'Users added successfully.',
            validUsers,
            invalidUsers,
          });
        } else {
          res.status(400).json({ message: 'No valid users to add.' });
        }

        if (invalidUsers.length > 0) {
          console.log('Invalid Users:', invalidUsers);
        }
      } catch (error) {
        console.error('Error inserting into MongoDB:', error);
        res.status(500).json({ message: 'Error saving users to the database' });
      }
    })
    .on('error', (error) => {
      console.error('Error parsing CSV file:', error);
      res.status(500).json({ message: 'Error parsing CSV file' });
    });
});

app.post('/api/webhook', async (req, res) => {
  try {
    const event = req.body;

    if (event && event.meta.event_name === "order_created") {
      const customerEmail = event.data.attributes.user_email;
      const productName = event.data.attributes.first_order_item.product_name;

      console.log(productName);
      const user = await User.findOne({ email: customerEmail });
      if (!user) {
        return res.status(404).json({ message: "User  not found." });
      }

      // Determine plan based on product_name
      let emailLimit, planStatus;

      if (productName.includes("premium")) {
        planStatus = "premium";
        emailLimit = 1000;  // Premium email limit
      } else {
        planStatus = "basic";
        emailLimit = 12;    // Basic email limit
      } 

      // Only update plan and email limit
      user.planStatus = planStatus;
      user.emailLimit = emailLimit;

      // Logic for Free to Basic transition
      if (user.planStatus === "basic" && user.emailsSent > emailLimit) {
        user.emailsSent = emailLimit;  // Ensure email count doesn't exceed basic limit (12)
      }

      // Logic for Basic to Premium transition
      if (user.planStatus === "premium") {
        // No reset of emailsSent unless the user was on free plan and exceeded limits
        if (user.emailsSent > emailLimit) {
          user.emailsSent = emailLimit;  // Ensure email count doesn't exceed basic limit (12) for basic to premium transition
        }
      }

      await user.save();

      console.log(`User  ${user.email} upgraded to ${user.planStatus} plan. New limit: ${user.emailLimit}`);
      return res.status(200).json({ message: `User  upgraded to ${user.planStatus} successfully` });
    }

    res.status(400).json({ message: "Invalid event type" });
  } catch (error) {
    console.error("Error processing Lemon Squeezy webhook:", error);
    res.status(500).json({ message: "Internal Server Error" });
  }
});

// Start the server
app.listen(PORT, () => {
  console.log(`Server is running on http://localhost:${PORT}`);
});
