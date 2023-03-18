// Original Collections



const mongoose = require('mongoose');

const booking = new mongoose.Schema({
    bookedProperty: String,
    checkinDate: Date,
    checkoutDate: Date,
    nights: {
        type: Number,
        default: 1
    },
    guests: {
        type: Number,
        default: 1
    }
});

// const Booking = new mongoose.model("Booking", booking);

// module.exports = Booking;

module.exports = new mongoose.model("Booking", booking);

