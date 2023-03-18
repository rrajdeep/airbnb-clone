const mongoose = require('mongoose');

const booking = new mongoose.Schema({
    // bookedProperty: [{type: mongoose.Schema.Types.ObjectId, ref: 'Property'}],
    email: String,
    bookedProperty: {
        data: Buffer,
        contentType: String
    },
    propertyName: String,
    city: String,
    state: String,
    country: String,
    checkinDate: Date,
    checkoutDate: Date,
    rooms: {
        type: Number,
        default: 1
    },
    guests: {
        type: Number,
        default: 1
    },
    nights: {
        type: Number,
        default: 1
    }
});

// const Booking = new mongoose.model("Booking", booking);

// module.exports = Booking;

module.exports = new mongoose.model("Booking", booking);