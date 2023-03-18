const mongoose = require('mongoose');

const support = new mongoose.Schema({
    name: String,
    email: String,
    contact: Number,
    help: String
});

// const Booking = new mongoose.model("Booking", booking);

// module.exports = Booking;

module.exports = new mongoose.model("Help", support);

