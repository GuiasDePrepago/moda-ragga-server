// require('dotenv').config()

// const express = require('express');
// const app = express();
// const cors = require('cors');
// app.use(cors({
//     origin: 'http://localhost:3000'
// }));

// const stripe = require('stripe')(process.env.STRIPE_PRIVATE_KEY);
// app.use(express.static("public"));
// app.use(express.json());

// const calculateOrderAmount = (items) => {
//     items.reduce((a, c) => a + c.qty * c.price, 0)
//     return 1400;
// };

// app.post("/create-payment-intent", async (req, res) => {
//     const { items } = req.body;
  
//     // Create a PaymentIntent with the order amount and currency
//     const paymentIntent = await stripe.paymentIntents.create({
//       amount: calculateOrderAmount(items),
//       currency: "mxn",
//       automatic_payment_methods: {
//         enabled: true,
//       },
//     });
  
//     res.send({
//       clientSecret: paymentIntent.client_secret,
//     });
// });



// app.post('/create-checkout-session', async (req, res) => {
//     try {
//         const session = await stripe.checkout.sessions.create({
//             payment_method_types: ['card'],
//             mode: 'payment',
//             line_items: req.body.items.map(item => {
//                 return {
//                     price_data: {
//                         currency: 'mxn',
//                         product_data: {
//                             name: item.name
//                         },
//                         unit_amount: item.price + '00'
//                     },
//                     quantity: item.qty
//                 }
//             }),
//             success_url: 'http://localhost:3000/success',
//             cancel_url: 'http://localhost:3000/failed',
//         })
//         res.json({ url: session.url }) 
//     } catch (e) {
//         res.status(500).json({error: e.message})
//     }
    
// })

// app.listen(4000)

const express = require("express");
const app = express();
const cors = require('cors');
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const bodyParser = require('body-parser');
const dbConnect = require("./db/dbConnect");
const User = require("./db/userModel");
const auth = require("./auth");
app.use(cors({
    origin: 'http://localhost:3000'
}));

app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

dbConnect();

module.exports = app;

// This is your test secret API key.
const stripe = require("stripe")('sk_test_51MEy8XEAiB7KKlYvwZS9W4eI7Kvc7zOXjXYaA4SR8qzmb6qCD3hISnra7hpdKwUbleXckLPe6sbN0cxmE3M4AGvu00aLw0GYPY');

app.use(express.static("public"));
app.use(express.json());

const calculateOrderAmount = (items) => {
  // Replace this constant with a calculation of the order's amount
  // Calculate the order total on the server to prevent
  // people from directly manipulating the amount on the client
  return 14000;
};



app.post("/register", async (request, response) => {
    const customer = await stripe.customers.create({
        email: request.body.email, // Pass email (Optional)
      });
    // hash the password
    bcrypt
      .hash(request.body.password, 10)
      .then((hashedPassword) => {
       
        // create a new user instance and collect the data
        const user = new User({
          email: request.body.email,
          password: hashedPassword,
          customerId: customer.id
        });
  
        // save the new user
        user
          .save()
          // return success if the new user is added to the database successfully
          .then((result) => {
            response.status(201).send({
              message: "User Created Successfully",
              customerId: customer.id,
              result,
            });
          })
          // catch error if the new user wasn't added successfully to the database
          .catch((error) => {
            response.status(500).send({
              message: "Error creating user",
              error,
            });
          });
      })
      // catch error if the password hash isn't successful
      .catch((e) => {
        response.status(500).send({
          message: "Password was not hashed successfully",
          e,
        });
      });
});

app.post("/login", (request, response) => {
    // check if email exists
    User.findOne({ email: request.body.email })
  
      // if email exists
      .then((user) => {
        // compare the password entered and the hashed password found
        bcrypt
          .compare(request.body.password, user.password)
  
          // if the passwords match
          .then((passwordCheck) => {
  
            // check if password matches
            if(!passwordCheck) {
              return response.status(400).send({
                message: "Passwords does not match",
                error,
              });
            }
  
            //   create JWT token
            const token = jwt.sign(
              {
                userId: user._id,
                userEmail: user.email,
              },
              "RANDOM-TOKEN",
              { expiresIn: "24h" }
            );
  
            //   return success response
            response.status(200).send({
              message: "Login Successful",
              email: user.email,
              customerId: user.customerId,
              token,
            });
          })
          // catch error if password does not match
          .catch((error) => {
            response.status(400).send({
              message: "Passwords does not match",
              error,
            });
          });
      })
      // catch error if email does not exist
      .catch((e) => {
        response.status(404).send({
          message: "Email not found",
          e,
        });
      });
  });
  

app.post('/payment-methods', async (req, res) => {
    const paymentMethods = await stripe.paymentMethods.list({
        customer: req.body.customer,
        type: "card",
      });

      res.send({
        paymentMethods: paymentMethods,
      });
})


app.post('/secret-add-card', async (req, res) => {
    const intent = await stripe.paymentIntents.create({
        amount: req.body.price,
        currency: 'mxn',
        setup_future_usage: 'off_session',
        customer: req.body.customer,
      });
    res.json({clientSecret: intent.client_secret});
  });

app.post('/secret', async (req, res) => {
    const intent = await stripe.paymentIntents.create({
        amount: req.body.price + '00' ,
        customer: req.body.customer,
        currency: 'mxn',
        });
    res.json({clientSecret: intent.client_secret});
});

app.post("/get-payment-methods", async (req, res) => {

    const paymentMethods = await stripe.paymentMethods.list({
        customer: req.body.customer,
        type: "card",
      });

  res.send({
    paymentMethods: paymentMethods,
  });
});

app.post("/create-payment-intent-saved-card", async (req, res) => {
      
    try {
        const paymentIntent = await stripe.paymentIntents.create({
          amount: req.body.price + '00',
          currency: 'mxn',
          customer: req.body.customer,
          payment_method: req.body.cardId,
          off_session: true,
          confirm: true,
        });
      } catch (err) {
        // Error code will be authentication_required if authentication is needed
        console.log('Error code is: ', err.code);
        //const paymentIntentRetrieved = await stripe.paymentIntents.retrieve(err.raw.payment_intent.id);
        console.log('PI retrieved: ', paymentIntentRetrieved.id);
      }
      res.status(200).send({
        message: 'payment done!',
      });
  });

  app.post("/add-card", async (req, res) => {
      
    const setupIntent = await stripe.paymentIntents.create({
        amount: 1000,
        currency: 'mxn',
        automatic_payment_methods: {enabled: true},
      });
  });

app.listen(4000, () => console.log("Node server listening on port 4242!"));