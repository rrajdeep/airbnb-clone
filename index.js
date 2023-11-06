const express = require("express");
const bodyParser = require("body-parser");
const mongoose = require("mongoose");
const ejs = require("ejs");
const multer = require("multer");
const path = require("path");
const fs = require("fs");
const dotenv = require('dotenv');
const jwt = require('jsonwebtoken');
const User = require('./models/register');
const Propertymodel = require('./models/properties');
const Booking = require("./models/booking");
const Help = require("./models/support");
const cookieParser = require("cookie-parser");
const auth = require("./auth");
const { nextTick } = require("process");

const app = express();

app.set('view engine', 'ejs');

// App use
app.use(bodyParser.urlencoded({ extended: true }));
app.use(cookieParser());
app.use(express.static('public'));
app.use('/uploads', express.static(__dirname + "/uploads"));
app.use('images', express.static(__dirname + "/images"));

// Global configuration access setup
dotenv.config();

mongoose.connect("mongodb://127.0.0.1:27017/airbnbClone", function () {
    console.log("Successfully connected to database");
})

// Store hotel images
const storage = multer.diskStorage({
    destination: function (req, file, cb) {
        cb(null, __dirname + '/public/uploads')
    },
    filename: function (req, file, cb) {
        cb(null, Date.now() + file.originalname)
    }
})

const upload = multer({ storage: storage });

// store profile image
const storageProfile = multer.diskStorage({
    destination: function (req, file, cb) {
        cb(null, __dirname + '/public/images')
    },
    filename: function (req, file, cb) {
        cb(null, file.originalname);
    }
})

const uploadImages = multer({ storage: storageProfile });


app.get("/", function (req, res) {
    try {
        let token = req.cookies.jwt;
        jwt.verify(token, process.env.JWT_SECRET_KEY, function (err, decoded) {
            if (!err) {
                res.redirect("myairbnb");
            } else {
                Propertymodel.find({}, function (err, result) {
                    if (err) {
                        res.send(err);
                    } else {
                        res.render("list", { properties: result });
                    }
                });
            }
        });
    } catch (err) {
        res.send(err);
    }
})

// search on homepage when user is not logged in
app.get("/search", async function (req, res) {
    try {
        let searchString = req.query.query;
        Propertymodel.find({ $text: { $search: searchString } }).exec(function (err, result) {
            if (!err) {
                res.render("list", { properties: result });
            }
        })

    } catch (error) {
        res.send("Error");
    }
})

// register
app.get("/register", function (req, res) {

    res.render("register", {})
})

app.post("/register", uploadImages.single('profile'), async function (req, res) {
    try {
        let email = req.body.email;
        let user = new User({
            userType: req.body.userType,
            fName: req.body.firstName,
            lName: req.body.lastName,
            gender: req.body.gender,
            dob: req.body.dob,
            contactNumber: req.body.contactNumber,
            img:
            {
                data: fs.readFileSync(path.join(__dirname + '/public/images/' + req.file.filename)),
                contentType: 'image/png'
            },
            city: req.body.city,
            country: req.body.country,
            email: email,
            password: req.body.password
        });

        const token = await user.generateAuthToken();
        await user.save(function (err, success) {
            if (err) {
                let errorMessage = "Could not register"
                let redirectLink = "register";
                let btnText = "Try again";
                res.render("failure", { redirectLink: redirectLink, btnText: btnText });
            } else {
                let redirectLink = "login";
                let btnText = "Login";
                res.render("success", { redirectLink: redirectLink, btnText: btnText });
            }
        });
    } catch (err) {
        res.send(err);
    }
})

// login
app.get("/login", function (req, res) {
    res.render("login");
})

app.post("/login", async function (req, res) {
    try {
        const userName = req.body.username;
        const pwd = req.body.password;
        const userNamedb = await User.findOne({ email: userName });
        if (userNamedb.password === pwd) {
            const token = await jwt.sign({ "email": userNamedb.email }, process.env.JWT_SECRET_KEY);
            res.cookie("jwt", token, {
                expires: new Date(Date.now() + 1800000),
                httpOnly: true
            });

            res.redirect("/myairbnb");

        } else {
            let errorMessage = "Invalid crentials or user does not exists";
            let redirectLink = "login";
            let btnText = "Try again";
            res.render("failure", { errorMessage: errorMessage, redirectLink: redirectLink, btnText: btnText });
        }

    } catch (err) {
        let errorMessage = "Error Signin in";
        let redirectLink = "login";
        let btnText = "Try again";
        res.render("failure", { errorMessage: errorMessage, redirectLink: redirectLink, btnText: btnText });
    }
})


// after login
app.get("/myairbnb", auth, async function (req, res) {
    try {
        let isGuest;
        let token = req.cookies.jwt;
        let user = jwt.verify(token, process.env.JWT_SECRET_KEY);
        const userNamedb = await User.findOne({ email: user.email });
        if (userNamedb.userType == 'host') {
            isGuest = false;
        } else {
            isGuest = true;
        }

        Propertymodel.find({}, function (err, result) {
            if (err) {
                res.send(err);
            } else {
                res.render("my", { properties: result, isGuest: isGuest, user: userNamedb });
            }
        })
    } catch (error) {
        let errorMessage = "Error fetching properties";
        let redirectLink = "";
        let btnText = "Try again";
        res.render("failure", { errorMessage: errorMessage, redirectLink: redirectLink, btnText: btnText });
    }
})

// search when user is logged in
app.get("/myairbnb/search", async function (req, res) {
    try {
        let searchString = req.query.query;
        let isGuest;
        let token = req.cookies.jwt;
        let user = jwt.verify(token, process.env.JWT_SECRET_KEY);
        const userNamedb = await User.findOne({ email: user.email });
        let userType = userNamedb.userType;
        if (userType == 'host') {
            isGuest = false;
        } else {
            isGuest = true;
        }
        Propertymodel.find({ $text: { $search: searchString } }).exec(function (err, result) {
            if (err) {
                let errorMessage = "Error fetching properties";
                let redirectLink = "myairbnb";
                let btnText = "My Airbnb";
                res.render("failure", { errorMessage: errorMessage, redirectLink: redirectLink, btnText: btnText });

            } else {
                res.render("my", { properties: result, isGuest: isGuest, user: userNamedb });
            }
        })
    } catch (error) {
        res.send(error)
    }
})

// my hosted properties
app.get("/myairbnb/hostedproperties", async function (req, res) {
    try {
        let token = req.cookies.jwt;
        let user = jwt.verify(token, process.env.JWT_SECRET_KEY);
        const userNamedb = await User.findOne({ email: user.email });

        if (userNamedb.userType == 'host') {
            Propertymodel.find({ email: userNamedb.email }, function (err, result) {
                if (result.length) {
                    res.status(200).render("host", { user: userNamedb, hostProperties: result });
                } else {
                    let errorMessage = "No properties to show";
                    let redirectLink = "registerproperty";
                    let btnText = "Host a property";
                    res.render("failure", { errorMessage: errorMessage, redirectLink: redirectLink, btnText: btnText });
                }
            });
        } else {
            res.redirect("/myairbnb");
        }
    } catch (err) {
        res.send("Error fetching hosted properties ");
    }
})

// Delete property
app.get("/delete/:property_id", function (req, res) {
    let deleteId = req.params.property_id;
    Propertymodel.deleteOne({ _id: deleteId }).then(function () {
        let redirectLink = "myairbnb/hostedproperties";
        let btnText = "My properties";
        res.render("success", { redirectLink: redirectLink, btnText: btnText });
    }).catch(function (error) {
        let errorMessage = "Error deleting property";
        let redirectLink = "myairbnb/hostedproperties";
        let btnText = "My properties";
        res.render("failure", { errorMessage: errorMessage, redirectLink: redirectLink, btnText: btnText });
    });
})

// Register property
app.get("/registerproperty", async function (req, res) {
    try {
        let isGuest = true;
        let cookieName = req.cookies.jwt;
        let user = jwt.verify(cookieName, process.env.JWT_SECRET_KEY, function (err, decoded) {
            if (err) {
                res.redirect("/login");
            } else {
                User.findOne({ email: decoded.email }, function (err, result) {
                    if (!err) {
                        if (result.userType == 'host') {
                            isGuest = false;
                            res.render("registerproperty", { user: result, isGuest: isGuest });
                        } else {
                            res.send("You are a guest, cannot host property");
                        }
                    }
                })
            }
        });
    } catch (error) {
        res.send(error);
    }
})

app.post("/registerproperty", uploadImages.array('images'), async function (req, res) {
    try {
        let property = new Propertymodel({
            propertyId: req.body.propertyId,
            propertyName: req.body.propertyName,
            owner: req.body.owner,
            city: req.body.city,
            state: req.body.state,
            country: req.body.country,
            pricing: req.body.price,
            sPricing: req.body.price,
            area: req.body.area,
            rating: req.body.rating,
            guests: req.body.guests,
            sGuest: req.body.guests,
            bedrooms: req.body.bedrooms,
            beds: req.body.beds,
            bathrooms: req.body.bathrooms,
            gardenview: req.body.gardenview,
            beachAccess: req.body.beachaccess,
            wifi: req.body.wifi,
            parking: req.body.parking,
            pool: req.body.pool,
            mountainview: req.body.mountainview,
            kitchen: req.body.kitchen,
            tv: req.body.tv,
            petsAllowed: req.body.pets,
            airconditioning: req.body.ac,
            workspace: req.body.workspace,
            alarm: req.body.alarm,
            img: [
                {
                    data: fs.readFileSync(path.join(__dirname + '/public/images/' + req.files[0].filename)),
                    contentType: 'image/png'
                },
                {
                    data: fs.readFileSync(path.join(__dirname + '/public/images/' + req.files[1].filename)),
                    contentType: 'image/png'
                },
                {
                    data: fs.readFileSync(path.join(__dirname + '/public/images/' + req.files[2].filename)),
                    contentType: 'image/png'
                },
                {
                    data: fs.readFileSync(path.join(__dirname + '/public/images/' + req.files[3].filename)),
                    contentType: 'image/png'
                }
            ],
            email: req.body.email
        });

        await property.save(function (err, success) {
            if (!err) {
                let redirectLink = "registerproperty";
                let btnText = "Add other property";
                res.render("success", { redirectLink: redirectLink, btnText: btnText });
            } else {
                let errorMessage = "Error registering property";
                let redirectLink = "registerproperty";
                let btnText = "Try again";
                res.render("failure", { errorMessage: errorMessage, redirectLink: redirectLink, btnText: btnText });
            }
        });
    } catch (error) {
        res.send(error);
    }

})

// handle particular property click
app.get("/property/:property_id", async function (req, res) {
    try {
        var requestedPropertyId = req.params.property_id;
        var requestedProperty;
        var hostEmail;
        let userNamedb;

        let token = req.cookies.jwt;
        jwt.verify(token, process.env.JWT_SECRET_KEY, function (err, decoded) {
            if (!err) {
                User.findOne({ email: decoded.email }, function (err, result) {
                    if (!err) {
                        userNamedb = result;
                    }
                });

                Propertymodel.findOne({ _id: mongoose.Types.ObjectId(requestedPropertyId) }, function (err, result) {
                    if (!err) {
                        requestedProperty = result;
                        hostEmail = requestedProperty.email;
                        User.findOne({ email: hostEmail }, function (err, doc) {
                            if (!err) {
                                res.render("property", { property: requestedProperty, hostProfile: doc, user: userNamedb });
                            }
                        });
                    } else {
                        console.log(err);
                    }
                });
            } else {
                Propertymodel.findOne({ _id: mongoose.Types.ObjectId(requestedPropertyId) }, function (err, result) {
                    if (!err) {
                        requestedProperty = result;
                        hostEmail = requestedProperty.email;
                        User.findOne({ email: hostEmail }, function (err, doc) {
                            if (!err) {
                                res.render("property", { property: requestedProperty, hostProfile: doc, user: {} });
                            }
                        });
                    } else {
                        console.log("Requested property not found");
                    }
                });
            }
        });
    } catch (error) {
        res.send(error);
    }
})


app.post("/property/:property_id", auth, async function (req, res) {
    try {
        var property_booked = req.params.property_id;
        let cookieName = req.cookies.jwt;
        let user = jwt.verify(cookieName, process.env.JWT_SECRET_KEY);
        Propertymodel.findOne({ _id: property_booked }, function (err, result) {
            if (err) {
                let errorMessage = "There was an error";
                let redirectLink = "myairbnb";
                let btnText = "My Airbnb";
                res.render("failure", { errorMessage: errorMessage, redirectLink: redirectLink, btnText: btnText });
            } else {
                let booking = new Booking({
                    email: user.email,
                    bookedProperty: result.img[0],
                    propertyName: result.propertyName,
                    city: result.city,
                    state: result.state,
                    country: result.country,
                    checkinDate: req.body.checkin,
                    checkoutDate: req.body.checkout,
                    nights: req.body.nights,
                    guests: req.body.noOfGuests
                });
                booking.save();
            }
        });
        let redirectLink = "mybookings";
        let btnText = "My bookings";
        res.render("success", { redirectLink: redirectLink, btnText: btnText });
    } catch (err) {
        res.send(err);
    }
})

// Show bookings
app.get("/mybookings", async function (req, res) {
    try {
        let token = req.cookies.jwt;
        const user = jwt.verify(token, process.env.JWT_SECRET_KEY);
        let userNamedb = await User.findOne({ email: user.email });
        Booking.find({ email: user.email }, function (err, result) {
            if (!err) {
                res.render("mybookings", { myBookings: result, user: userNamedb });
            }
        })
    } catch (error) {
       res.send(error);
    }
})

// app.post("/mybookings", async function (req, res) {
//     try {
//         var property_booked = req.body.propertyBooked;
//         const name = req.cookies.jwt;
//         const property = await Propertymodel.findOne({ _id: mongoose.Types.ObjectId(property_booked) }, function (err, result) {
//             if (err) {
//                 res.send(err)
//             } else {
//                 console.log(result);
//             }
//         })

//         let booking = new Booking({
//             bookedProperty: property_booked,
//             checkinDate: req.body.checkin,
//             checkoutDate: req.body.checkout,
//             nights: req.body.nights,
//             guests: req.body.noOfGuests
//         });
//         await booking.save();
//         let redirectLink = "mybookings";
//         let btnText = "My bookings";
//         res.render("success", { redirectLink: redirectLink, btnText: btnText });
//     } catch (err) {
//         res.send(err);
//     }
// })

// Cancel booking
app.get("/deletebooking", async function (req, res) {
    try {
        let prop = req.query.cancelProperty;
        Booking.deleteOne({ _id: mongoose.Types.ObjectId(prop) }).then(function () {
            let redirectLink = "mybookings";
            let btnText = "My bookings";
            res.render("success", { redirectLink: redirectLink, btnText: btnText });
        }).catch(function (error) {
            let errorMessage = "Error cancelling booking";
            let redirectLink = "";
            let btnText = "Home";
            res.render("failure", { errorMessage: errorMessage, redirectLink: redirectLink, btnText: btnText });
        })
    } catch (error) {
        let errorMessage = "Error cancelling booking";
        let redirectLink = "mybookings";
        let btnText = "My bookimgs";
        res.render("failure", { errorMessage: errorMessage, redirectLink: redirectLink, btnText: btnText });
    }
})

// handle reviews
app.get("/review/:p", async function (req, res) {
    try {

        res.render("review", {});
    } catch (error) {
        res.send("Error");
    }
})

app.post("/review/:p", async function (req, res) {
    try {
        let prpt = req.params.p;
        let name = req.body.name;
        let rating = req.body.starRating;
        let review = req.body.review;
        let reviewObj = {
            userName: name,
            starRating: rating,
            reviewContet: review
        }

        Propertymodel.findOneAndUpdate({ _id: mongoose.Types.ObjectId(prpt) }, { $push: { review: reviewObj } }, function (err, success) {
            if (err) {
                let errorMessage = "Error submitting review";
                let redirectLink = "";
                let btnText = "Try again";
                res.render("failure", { errorMessage: errorMessage, redirectLink: redirectLink, btnText: btnText });
            } else {
                res.render("success");
            }
        });

    } catch (error) {
        res.send("Error submitting review");
    }
})

// help
app.get("/help", function (req, res) {
    res.render("help", {});
})

app.post("/help", function (req, res) {
    try {
        let supportQuery = new Help({
            name: req.body.name,
            email: req.body.email,
            contact: req.body.contact,
            help: req.body.comment
        })
        supportQuery.save();
        let redirectLink = "help";
        let btnText = "Go to help";
        res.render("success", { redirectLink: redirectLink, btnText: btnText });
    } catch (error) {
        let errorMessage = "There was an error";
        let redirectLink = "/help";
        let btnText = "Try again";
        res.render("failure", { errorMessage: errorMessage, redirectLink: redirectLink, btnText: btnText });
    }
})

// admin
app.get("/admin", function (req, res) {
    res.status(200).render("admin");
})

app.post("/admin", async function (req, res) {
    try {
        let username = req.body.username;
        let pass = req.body.password;
        if (username == "admin" && pass == 12345) {
            res.redirect("/admin/dashboard");
        } else {
            let errorMessage = "There was an error";
            let redirectLink = "admin";
            let btnText = "Try again";
            res.render("failure", { errorMessage: errorMessage, redirectLink: redirectLink, btnText: btnText });
        }

    } catch (error) {
        let errorMessage = "Unexpected error occurred";
        let redirectLink = "admin";
        let btnText = "Try again";
        res.render("failure", { errorMessage: errorMessage, redirectLink: redirectLink, btnText: btnText });
    }
})

app.get("/admin/dashboard", function (req, res) {
    res.render("admindashboard", {});
})

// manage users
app.get("/admin/manageusers", async function (req, res) {
    try {
        User.find({}, function (err, doc) {
            if (!err) {
                res.render("manageusers", { users: doc });
            } else {
                res.send(err);
            }
        });

    } catch (error) {
        res.send(error);
    }
})

app.get("/admin/manageproperties", async function (req, res) {
    try {
        Propertymodel.find({}, function (err, doc) {
            if (!err) {
                res.render("manageproperties", { properties: doc });
            } else {
                res.send(err);
            }
        });

    } catch (error) {
        res.send(error);
    }
})

app.get("/admin/managebookings", async function (req, res) {
    try {
        Booking.find({}, function (err, doc) {
            if (!err) {
                res.render("managebookings", { bookings: doc });
            } else {
                res.send(err)
            }
        });

    } catch (error) {
        res.send(error)
    }
})

app.get("/admin/customersupport", async function (req, res) {
    try {
        Help.find({}, function (err, doc) {
            if (!err) {
                res.render("managesupport", { queries: doc });
            } else {
                res.send(err);
            }
        });

    } catch (error) {
        res.send(error);
    }
})

app.get("/admin/manageusers/:uid", function (req, res) {
    let delId = req.params.uid;
    User.deleteOne({ _id: mongoose.Types.ObjectId(delId) }).then(function () {
        res.redirect("/admin/manageusers");
    }).catch(function (error) {
        res.send(err);
    })
})

app.get("/admin/manageproperties/:pid", function (req, res) {
    let delId = req.params.pid;
    Propertymodel.deleteOne({ _id: mongoose.Types.ObjectId(delId) }).then(function () {
        res.redirect("/admin/manageproperties");
    }).catch(function (error) {
        res.send(error);
    })
})

app.get("/admin/managebookings/:bookedproperty", function (req, res) {
    let delId = req.params.bookedproperty;
    Booking.deleteOne({ _id: mongoose.Types.ObjectId(delId) }).then(function () {
        res.redirect("/admin/managebookings");
    }).catch(function (error) {
        res.send(error);
    })
})

app.get("/admin/customersupport/:qid", function (req, res) {
    let delId = req.params.qid;
    Help.deleteOne({ _id: mongoose.Types.ObjectId(delId) }).then(function () {
        res.redirect("/admin/customersupport");
    }).catch(function (error) {
        res.send(error);
    })
})

// site instruction
app.get("/siteinstructions", function (req, res) {
    res.render("siteinstructions")
})

// logout
app.get("/logout", function (req, res) {
    res.clearCookie("jwt");
    res.redirect("/");
})

app.listen(process.env.PORT || 3000, () => {
    console.log(`Server is running`);
})

module.exports = app;
