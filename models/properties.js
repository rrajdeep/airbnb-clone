var mongoose = require('mongoose');

const propertySchema = new mongoose.Schema({
    propertyId: Number,
    propertyName: String,
    owner: String,
    city: String,
    state: String,
    country: String,
    pricing: Number,
    sPricing: String,
    area: Number,
    rating: Number,
    guests: Number,
    sGuest: String,
    bedrooms: Number,
    beds: Number,
    bathrooms: Number,
    gardenview: {
        type: Boolean,
        default: false
    },
    beachAccess: {
        type: Boolean,
        default: false
    },
    wifi: {
        type: Boolean,
        default: false
    },
    parking: {
        type: Boolean,
        default: false
    },
    pool: {
        type: Boolean,
        default: false
    },
    maountainview: {
        type: Boolean,
        default: false
    },
    kitchen: {
        type: Boolean,
        default: false
    },
    tv: {
        type: Boolean,
        default: false
    },
    petsAllowed: {
        type: Boolean,
        default: false
    },
    airconditioning: {
        type: Boolean,
        default: false
    },
    workspace: {
        type: Boolean,
        default: false
    },
    alarm: {
        type: Boolean,
        default: false
    },
    img: [
        {
            data: Buffer,
            contentType: String
        },
        {
            data: Buffer,
            contentType: String
        },
        {
            data: Buffer,
            contentType: String
        },
        {
            data: Buffer,
            contentType: String
        },
    ],
    email: String,
    review: [
        {
            userName: String,
            starRating: Number,
            reviewContet: String
        }
    ]
});

propertySchema.index({'$**': 'text'});

module.exports = new mongoose.model("Property", propertySchema);