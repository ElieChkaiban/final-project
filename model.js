//mongoose craetion
const mongoose = require('mongoose');                              
//pet Schema
const imgSchema = new mongoose.Schema({                                             
    path:{type: String, required: true},                                                                 
    filename:{type: String, required: true},                                                     
    petname: String,                                                
    pettype: String,                                                                                
    contactnumber: String,                                                                             
    pstate: String                                       
});                                                   
const model = mongoose.model('img', imgSchema);                                                         
//module export
module.exports = mongoose.model('Pet', imgSchema);
                                                             