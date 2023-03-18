const mongoose = require('mongoose');
const jwt = require("jsonwebtoken");

var userSchema = new mongoose.Schema({
    userType: String,
    fName: String,
    lName: String,
    gender: String,
    dob: Date,
    contactNumber: Number,
    img: {
        data: Buffer,
        contentType: String
    },
    city: String,
    country: String,
    email: String,
    password: String,
    tokens: {
        type: String
    }
});

// generating token
userSchema.methods.generateAuthToken = async function () {
    try {
        console.log(this.email);
        // const token = jwt.sign({_id: this._id}, process.env.JWT_SECRET_KEY);
        // this.tokens = this.tokens.concat({token: token});

        const token = jwt.sign({"email": this.email}, process.env.JWT_SECRET_KEY);
        this.tokens = token;
        await this.save();
        return token;
    } catch (error) {
        res.send("The error part" + error);
        console.log("The error part" + error);
    }

}

var User = new mongoose.model('user', userSchema);
module.exports = User;