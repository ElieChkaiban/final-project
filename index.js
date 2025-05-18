const express = require('express');
const bodyParser = require('body-parser');
const mongoose = require('mongoose');
const bcrypt = require('bcrypt');
const session = require('express-session');
const multer = require('multer');
const path = require('path');
require('dotenv').config();
//create express app
const app = express();
app.set('view engine', 'ejs');
//middleware                                                                  
app.use((req, res, next) => {
    res.header('Access-Control-Allow-Origin', '*');
    res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE');
    res.header('Access-Control-Allow-Headers', 'Content-Type');
    next();
});
//Mongo DB Connection URL                                      
mongoose.connect('mongodb://localhost:27017/PetFinder')                               
    .then(() => console.log('MongoDB connected'))                                   
    .catch(err => console.error('MongoDB connection error:', err));                         

app.use(express.json());
app.use(express.static('public'));                                           
app.use(express.urlencoded({ extended: true }));                                       
app.use(session({
    secret: "freez is a dog",
    resave: false,
    saveUninitialized: true,
}));
                                       
const db = mongoose.connection;                                         
db.on('error', console.error.bind(console, 'connection error:'));
db.once('open', () => console.log("Connected to Database established"));

//multer for file upload                       
const storage = multer.diskStorage({                     
    destination: (req, file, cb) => {
        cb(null, './public/upload');                                                                            
    },                                      
    filename: (req, file, cb) => {                                  
        cb(null, Date.now() + path.extname(file.originalname));                           
    }                              
});                              

const upload = multer({ storage });                                          
//sign_up logic
app.post("/sign_Up", async (req, res) => {
    const { name, lastname, email, password, usertype } = req.body;

    //hashing pass
    const hashedPassword = await bcrypt.hash(password, 10);

    const data = {
        name,
        lastname,
        email,
        password: hashedPassword, 
        usertype
    };
    //insert new user in database
    db.collection('users').insertOne(data, (err) => {
        if (err) {
            console.error("Error inserting user:", err);
            return res.status(500).send("Error creating user");
        }
        console.log("New User Created Successfully");
        req.session.user = data;
        if (data.usertype === 'admin') {
            return res.redirect('admin_interface.html');
        } else {
            return res.redirect('user_interface.html');
        }
    });
});


// sign_in logic
app.post("/sign_in", async (req, res) => {
    try {
        const user = await db.collection('users').findOne({ email: req.body.email })
        if (user) {
            console.log("USER", user)
            console.log("User  password from DB:", user.password);
            console.log("Password entered:", req.body.password);
            const match = await bcrypt.compare(req.body.password, user.password);
            //Redirection
            if (match) {
                req.session.email = req.body.email; 
                if (user.usertype === 'admin') {
                    return res.redirect('admin_interface.html');
                } else {
                    return res.redirect('user_interface.html'); 
                }
            } else {
                console.error("Password doesn't match for user:", req.body.email);
                return res.status(400).json({ error: "Password doesn't match" }); 
            }
        } else {
            console.error("User  doesn't exist:", req.body.email); 
            return res.status(400).json({ error: "User  doesn't exist" }); 
        }
    } catch (error) {
        console.error("Error during sign-in:", error); 
        return res.status(500).json({ error: "An error occurred during sign-in" }); 
    }
});
// change password logic
app.post("/change", async (req, res) => {
    console.log('Received change password request:', req.body);
    const { email, password, newpassword } = req.body;
                            
    try {
                                                  
        const user = await db.collection('users').findOne({ email: email });
        if (!user) {
            return res.status(400).json({ error: "User  not found" });
        }                                    

                                                               
        const match = await bcrypt.compare(password, user.password);
        if (!match) {
            return res.status(400).json({ error: "Enter a valid old password" });
        }
                                                            
        const hashedNewPassword = await bcrypt.hash(newpassword, 10);
        //user password Update                                      
        await db.collection('users').updateOne(
            { email: email },
            { $set: { password: hashedNewPassword } }
        );

        return res.status(200).json({ message: "Password successfully changed" });
    } catch (error) {
        //Error in password changing
        console.error("Error changing password:", error);
        return res.status(500).json({ error: "An error occurred while changing the password" });
    }
})

app.get("/", (req, res) => {
    res.set({
        "Allow-access-Allow-Origin": '*'
    });
    return res.redirect('homepage.html');
});
                
app.get("/user_interface", async (req, res) => {
    try {
        const pets = await db.collection('Pets').find().toArray();
        //Display pet info 
        res.render('user_interface', { pets }); 
    } catch (err) {
        console.error("Error fetching pets form database:", err);
        res.status(500).send("Error fetching pets form database");
    }
});
//Access files in upload folder
app.use('/upload', express.static(path.join(__dirname, 'upload')));
// delete post
app.delete("/pets/:id", async (req, res) => {
    const petId = req.params.id;
    try {
        const result = await db.collection('Pets').deleteOne({ _id: mongoose.Types.ObjectId(petId) });
        if (result.deletedCount === 1) {
            res.status(200).send("Pet deleted successfully");
        } else {
            res.status(404).send("Pet not found");
        }
    } catch (error) {
        console.error("Error deleting pet:", error);
        res.status(500).send("Error deleting pet");
    }
});                                       
//server port
app.listen(3000, () => {                                
    console.log("Listening on port 3000");                              
});                                             

// Pet upload
app.post("/pet_in", upload.single('image'), async (req, res) => {                           
    const { petname, pettype, contactnumber } = req.body;                                 
    if (!req.file) {                                         
        return res.status(400).send("No file uploaded.");                                 
    }                                                              
    const petphoto = `/upload/${req.file.filename}`;                                        
                                                               
                                               
    const pstate = req.body['lost-found Pet'];                                                    
//Pet Data                                                                      
    const petdata = {                  
        petname,                            
        pettype,                       
        petphoto,                          
        contactnumber,                                                                       
        pstate                                          
    };                                 
//inserting a new pet in the database                           
    try {                                                  
        await db.collection('Pets').insertOne(petdata);                     
        console.log("Pet uploaded");                                    
        return res.redirect('user_interface.html');                             
    } catch (err) {                                         
        console.error("Error inserting pet:", err);                                     
        return res.status(500).send("Failed to upload pet. Please try again.");                         
    }                                                      
});   
app.post("/pet_inad", upload.single('image'), async (req, res) => {                           
    const { petname, pettype, contactnumber } = req.body;                                 
    if (!req.file) {                                         
        return res.status(400).send("No file uploaded.");                                 
    }                                                              
    const petphoto = `/upload/${req.file.filename}`;                                        
                                                               
                                               
    const pstate = req.body['lost-found Pet'];                                                    
//Pet Data                                                                      
    const petdata = {                  
        petname,                            
        pettype,                       
        petphoto,                          
        contactnumber,                                                                       
        pstate                                          
    };                                 
//inserting a new pet in the database                           
    try {                                                  
        await db.collection('Pets').insertOne(petdata);                     
        console.log("Pet uploaded");                                    
        return res.redirect('admin_interface.html');                             
    } catch (err) {                                         
        console.error("Error inserting pet:", err);                                     
        return res.status(500).send("Failed to upload pet. Please try again.");                         
    }                                                      
});                                                                                       
//get pets from database                                             
app.get("/pets", async (req, res) => {                            
    try {                                   
        const pets = await db.collection('Pets').find().toArray();
                                                          
        const formattedPets = pets.map(pet => ({
            ...pet,                           
            id: pet._id.toString()
        }));
        res.json(formattedPets);
    } catch (err) {
        console.error("Error getting pets from database", err);
        res.status(500).send("Error getting pets from database");
    }                                         

});

//search pets logic
app.get("/pets/search", async (req, res) => {
    const query = req.query.q;
    if (!query) {
        return res.status(400).json({ error: "Missing search query parameter 'q'" });
    }
    try {
        // Seacrh pets
        const pets = await db.collection('Pets').find({
            $or: [
                { petname: { $regex: query, $options: 'i' } },
                { pettype: { $regex: query, $options: 'i' } }
            ]
        }).toArray();

        const formattedPets = pets.map(pet => ({
            ...pet,
            id: pet._id.toString()
        }));

        res.json(formattedPets);
    } catch (err) {
        console.error("Error searching pets:", err);
        res.status(500).send("Error searching pets");
    }
});
//contact members                                                  
app.get("/contactmeb", async (req, res) => {
    try {                                                             
        const pets = await db.collection('users').find().toArray();
        res.render('contactmeb', { users }); 
    } catch (err) {
        console.error("Error getting users info:", err);
        res.status(500).send("Error getting users info");
    }
});
//get users from database                                                  
app.get("/users", async(req, res)=>{ 
    try{
        const users = await db.collection('users').find().toArray();
        res.json(users);
        }catch(err){                                      
            console.error("Error fetching users:", err);                                          
            res.status(500).send("Error fetching users");                       
        }                                             
    
});                                                                                    
                                                                                       
                    