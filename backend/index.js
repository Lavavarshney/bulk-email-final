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
const path = require('path');
require('dotenv').config();

const apiKey = process.env.BREVO_API_KEY;
const emailTracking = {}; // { email: { delivered: count, clicked: count } }


app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

console.log("Hugging Face API Token:", process.env.HUGGINGFACE_API_TOKEN);

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
    console.log("All ENV Variables:", process.env);
console.log("Hugging Face API Token:", process.env.HUGGINGFACE_API_TOKEN);

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

const calculateTimeDifference = (scheduleTime) => {
  if (!scheduleTime) return null; // Return null if no schedule time is set

  const currentTime = new Date(); // Get the current time
  const scheduledDateTime = new Date(scheduleTime); // Convert the input to a Date object

  // Log the current time and scheduled time for debugging
  console.log("Current Time:", currentTime);
  console.log("Scheduled Time:", scheduledDateTime);

  // Calculate the difference in milliseconds
  const differenceInMilliseconds = scheduledDateTime.getTime() - currentTime.getTime();

  // Log the calculated difference
  console.log("Difference in Milliseconds:", differenceInMilliseconds);

  // If the scheduled time is in the past, return null or handle accordingly
  if (differenceInMilliseconds < 0) {
    return null; // Indicate that the scheduled time is in the past
  }

  return differenceInMilliseconds; // Return the delay in milliseconds
};
// Helper function to validate email format
const isValidEmail = (email) => {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
};
// Route to generate email content
app.post('/generate-email-content', async (req, res) => {
  const { prompt } = req.body;

  try {
    const response = await axios.post('https://api-inference.huggingface.co/models/google/gemma-2-2b-it', {
      inputs: prompt,
    }, {
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${process.env.HUGGINGFACE_API_TOKEN}`,
      },
    });

    dynamicEmailContent = response.data[0].generated_text; // Assuming the response structure
    console.log('Generated email content:', dynamicEmailContent);
    res.status(200).json({ message: 'Email content generated successfully', content: dynamicEmailContent });
  } catch (error) {
    console.error('Error generating email content:', error);
    res.status(500).json({ message: 'An error occurred while generating the email content.' });
  }
});
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

const processedEvents = new Set();
app.post('/webhook', async(req, res) => {
  const eventData = req.body;
  console.log(eventData);
  const { event, email, 'message-id': messageId } = eventData;
  if (!emailTracking[email]) {
    emailTracking[email] = { delivered: 0, clicked: 0, opened: 0 };
  }
  if (event === 'delivered') {
    emailTracking[email].delivered += 1;

    console.log(`Email ${email} with Message ID ${messageId} was delivered.`);
    // Perform actions when email is delivered, such as updating a record or notifying the user.
  }
    if(event === 'click')
  {
    emailTracking[email].clicked += 1;
    console.log(`Email ${email} with Message ID ${messageId} clicked.`);
      }
      if(event === 'unique_opened'){
        emailTracking[email].opened += 1;
        
        console.log(`Email ${email} with Message ID ${messageId} was opened.`);
       
      }

});



// Helper function to send email
const sendEmailAndNotifyWebhook = async (senderName, recipientEmail, recipientName,subject) => {
  try {
     console.log("Sending email to:", recipientEmail); 

    const personalizedEmailContent = dynamicEmailContent.replace('{{name}}', recipientName);
    const emailContent = `${personalizedEmailContent}`

    const sendSmtpEmail = {
      sender: { email: "lavanya.varshney2104@gmail.com", name: senderName },
      to: [{ email: recipientEmail }],
      subject: subject,
      htmlContent: emailContent,
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
app.get('/open-rate',async (req, res) => {
  const totalUsers = await User.countDocuments({});
  const rates = Object.entries(emailTracking).map(([email, { delivered, opened }]) => {
    const effectiveDelivered = delivered || totalUsers; 
    const openRate = effectiveDelivered > 0 ? ((opened / effectiveDelivered) * 100).toFixed(2) : 0;
    return { email, delivered: effectiveDelivered , opened, openRate: `${openRate}%` };
  });

  res.status(200).json(rates);
});

app.get('/click-rate', async (req, res) => {
  const totalUsers = await User.countDocuments({});
  const rates = Object.entries(emailTracking).map(([email, { delivered, clicked }]) => {
    const effectiveDelivered = delivered || totalUsers; // Fallback to total user count if delivered is 0
    const clickRate = effectiveDelivered > 0 ? ((clicked / effectiveDelivered) * 100).toFixed(2) : 0;
    return { email, delivered: effectiveDelivered, clicked, clickRate: `${clickRate}%` };
  });

  res.status(200).json(rates); // Ensure you return the response
});

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
  const { emailList, scheduleEmail, scheduleTime,subject } = req.body; // Add scheduling options
  console.log("emailList", emailList);
  const emailContent = req.body.emailContent; // Access the email content
  console.log('Email content received:', emailContent);

  dynamicEmailContent = emailContent;
  console.log(dynamicEmailContent);
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

  const FREE_EMAIL_LIMIT = 2;
  const BASIC_EMAIL_LIMIT = 5;
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
      message: 'You have reached the Basic plan limit (5 emails). Please upgrade to Premium.',
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
    // Use a Set to track processed emails
    const processedEmails = new Set();
        // Process each valid email
       const emailPromises = validEmails.map(async ({ name, email }) => {
       const emailAlreadySent = user.sentEmails.some(sentEmail => sentEmail.emailContent === emailContent && sentEmail.email === email);
      // Check if user already exists in the database
         if (emailAlreadySent  || processedEmails.has(email)) {
        console.log(`Email already sent to ${email}. Skipping.`);
        return; // Skip sending if the email has already been sent
      }
         
      // Mark this email as processed
      processedEmails.add(email);

      if (scheduleEmail && scheduleTime) {
        // If scheduling is enabled, calculate delay and schedule the email
         const delay = calculateTimeDifference(scheduleTime); 
        console.log(delay);
        if (delay !== null) {
          setTimeout(async () => {
            await sendEmailAndNotifyWebhook(decoded.name, email, name,subject);
            user.emailsSent += 1; 
            user.sentEmails.push({ emailContent, timestamp: new Date() }); // Track the sent email
            await user.save(); // Save the updated user instance
            console.log("emailSent count", user.emailsSent);
            console.log(`Scheduled email sent to ${email} after ${scheduleTime}`);
          }, delay);
        } else {
          console.log(`Invalid schedule time for ${email}. Email not scheduled.`);
        }
      } else {
        // Send email immediately if no scheduling is set
        await sendEmailAndNotifyWebhook(decoded.name, email, name,subject);
        user.emailsSent += 1; 
        user.sentEmails.push({ emailContent, timestamp: new Date() }); // Track the sent email
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


app.post('/upload-csv', upload.single('csvFile'), async (req, res) => {
  if (!req.file) {
    return res.status(400).send('No file uploaded.');
  }
const processedEmails = new Set(); 
  const token = req.headers['authorization'];  // Get the token from the headers
  const tokenWithoutBearer = token.startsWith('Bearer ') ? token.split(' ')[1] : token;
  let decoded;
  try {
    decoded = verifyToken(tokenWithoutBearer); // Verify the token to get user info
  } catch (error) {
    return res.status(401).json({ message: 'Invalid or expired token' });
  }
  const subject = req.body.subject;
  const emailContent = req.body.emailContent; // Access the email content
  console.log('Email content received:', emailContent);
    console.log('Subject received:', subject);
  dynamicEmailContent = emailContent; // Set the email content
  console.log('File received:', req.file);
  
  const validUsers = [];
  const invalidUsers = [];
  const rows = [];
  const filePath = req.file.path; 

  // Retrieve the user instance from the database
  const user = await User.findOne({ email: decoded.email });
  if (!user) {
    return res.status(404).json({ message: 'User  not found' });
  }

  // CSV Parsing
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
          // Check if the email was already processed in this session
     if (processedEmails.has(cleanedEmail)) {
    console.log(`Duplicate email in same upload: ${cleanedEmail}. Skipping.`);
    invalidUsers.push({ name: cleanedName, email: cleanedEmail });
    continue;
    }

  // Check if the email was already sent before (from DB)
  const emailAlreadySent = user.sentEmails.some(
    sentEmail => sentEmail.emailContent === emailContent && sentEmail.email === cleanedEmail
  );
  if (emailAlreadySent) {
    console.log(`Email already sent to ${cleanedEmail}. Skipping.`);
    invalidUsers.push({ name: cleanedName, email: cleanedEmail });
    continue;
  }

  // Add to valid users and mark as processed
  validUsers.push({ name: cleanedName, email: cleanedEmail });
  processedEmails.add(cleanedEmail); // Mark email as processed
}

      // Check if the user can send more emails after processing the CSV
      const totalEmailsToSend = validUsers.length + user.emailsSent;
      const FREE_EMAIL_LIMIT = 2;
      const BASIC_EMAIL_LIMIT = 5;
      const PREMIUM_EMAIL_LIMIT = 1000;

      if (user.planStatus === "free" && totalEmailsToSend > FREE_EMAIL_LIMIT) {
        const checkoutUrl = `https://myappstore.lemonsqueezy.com/buy/45f80958-7809-49ef-8a3f-5aa75851adc3`; // Free -> Premium URL
        return res.status(402).json({
          message: 'Email limit reached. Please upgrade to Premium.',
          checkoutUrl
        });
      }

      if (user.planStatus === "basic" && totalEmailsToSend > BASIC_EMAIL_LIMIT) {
        const checkoutUrl = `https://myappstore.lemonsqueezy.com/buy/2f666a6a-1ebb-4bdb-bfae-2e942ba9d12a`; // Basic -> Premium URL
        return res.status(402).json({
          message: 'You have reached the Basic plan limit (5 emails). Please upgrade to Premium.',
          checkoutUrl
        });
      }

      if (user.planStatus === "premium" && totalEmailsToSend > PREMIUM_EMAIL_LIMIT) {
        const checkoutUrl = `https://myappstore.lemonsqueezy.com/buy/2f666a6a-1ebb-4bdb-bfae-2e942ba9d12a`; // Premium -> Reached Limit URL
        return res.status(402).json({
          message: 'Email limit reached. Please upgrade to a higher plan.',
          checkoutUrl
        });
      }
console.log(user.planStatus);
      // Process valid users and send emails
      for (const { name, email } of validUsers) {
        try {
          // Schedule the email if scheduling parameters are provided
          if (req.body.scheduleEmail && req.body.scheduleTime) {
            const delay = parseScheduleTime(req.body.scheduleTime);
            if (delay !== null) {
              setTimeout(async () => {
                await sendEmailAndNotifyWebhook(decoded.name, email, name,subject);
                console.log(`Scheduled email sent to ${email} after ${req.body.scheduleTime}`);
            // Add the email to sentEmails array in the database
        user.sentEmails.push({ emailContent, email });
                user.emailsSent += 1; 
                await user.save(); // Save the updated user instance
              }, delay);
            } else {
              console.log(`Invalid schedule time for ${email}. Email not scheduled.`);
            }
          } else {
            // Send email immediately if no schedule is set
            await sendEmailAndNotifyWebhook(decoded.name, email, name,subject);
                // Add the email to sentEmails array in the database
    user.sentEmails.push({ emailContent, email });
            user.emailsSent += 1; 
            await user.save(); // Save the updated user instance
            console.log(user.emailsSent); // Log the updated email count
          }
        } catch (error) {
          console.error('Error sending email:', error);
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
    console.log("event",event);
    if (event && event.meta.event_name === "order_created") {
      const customerEmail = event.data.attributes.user_email;
      const productName = event.data.attributes.first_order_item.product_name;

      console.log(productName);
      console.log("customer email", customerEmail);
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
        emailLimit = 5;    // Basic email limit
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
 
