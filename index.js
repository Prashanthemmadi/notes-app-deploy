const express = require("express") 
const mongoose = require("mongoose");
const jwt = require("jsonwebtoken");
const bcrypt = require("bcryptjs");
const bodyParser = require("body-parser") 
const cors = require("cors") 
const app = express() 
app.use(bodyParser.json()) 
app.use(cors()) 

//CONNECTING TO DATABASE
const mongoUrl = "mongodb+srv://prashanthemmadi5:prashanth123@cluster0.ysznwbc.mongodb.net/NotesApp?retryWrites=true&w=majority&appName=Cluster0" 
mongoose.connect(mongoUrl).then(()=>{
    console.log("Database connected")
}) 
.catch((e)=>{
    console.log(e)
}) 

// USER SCHEMA 
const authSchema = new mongoose.Schema({
    username:{
        type:String,
        required:true
    },
    email:{
        type:String,
        required:true,
        unique:true
    },
    password:{
        type:String,
        required:true
    }
}) 
const User = mongoose.model('User', authSchema);  

//NOTE SCHEMA 
const NoteSchema = new mongoose.Schema({
    title:{
        type:String,
        required:true
    },
    content:{
        type:String,
        required:true
    },
    tags:[{type:String}],
    backgroundColor:{
        type:String,
        default:"#ffffff"
    },
    archived:{
        type:Boolean,
        default:false
    },
    trashed:{
        type:Boolean,
        default:false
    },
    createdAt:{
        type:Date,
        default:Date.now
    },
    userId:{
        type:mongoose.Schema.Types.ObjectId,
        ref:"User"
    }

}) 

const Note = mongoose.model("Note",NoteSchema)

// USER REGISTRATION 
app.post("/auth/register",async(req,res)=>{
    const {username,email,password} = req.body 
    try{
        const checkEmail = await User.findOne({email}) 
        if(checkEmail){
            return res.status(400).json({warning:"Email already exist!"})
        } 
        const hashedPassword = await bcrypt.hash(password,10) 
        const newUser = new User({
            username,
            email,
            password:hashedPassword
        });
        await newUser.save();
        res.status(200).json({message:"User registerd successfully"}) 
        console.log("Registerd")
 
    }catch(e){
         console.log(e)
          res.status(500).json({error:"Internal server error"})
    }
})

//USER LOGIN 
app.post("/auth/login",async(req,res)=>{ 
    const {email,password} = req.body;
    try{
       const findUser = await User.findOne({email})  
       if(!findUser || !(await bcrypt.compare(password,findUser.password))){
              return res.status(401).json({error:"Invalid username or password"});
       } 

       const jwt_token = jwt.sign({userId:findUser._id},"secretkey",{expiresIn:"1h"})
       res.status(200).json({message:"Login Successfully",jwt_token}) 
       console.log(email)
    }catch(e){
         console.log(e) 
         res.status(500).json("Internal Error")
    }

})

//MIDDLEWARE TO CHECK JWT TOKEN
const authenticateToken = (req,res,next)=>{
    const authHeader = req.header("Authorization");
    if (!authHeader) {
        return res.status(401).json({ error: "Access denied" });
    }
    const token = authHeader.split(" ")[1];
    if(!token){
        return res.status(401).json({error:"Access denied"}) 
    } 
    try{
        const verified = jwt.verify(token,"secretkey") 
        req.user = verified 
        next()
    }catch(e){
        res.status(400).json({error:"Invalid token"})
    }
} 

//CREATE A NEW NOTE 
app.post("/notes",authenticateToken,async(req,res)=>{
    const {title,content,tags,backgroundColor} = req.body  
    try{
        const note = new Note({
            title,
            content,
            tags,
            backgroundColor,
            userId: req.user.userId
        }) 
        await note.save() 
        res.status(201).json(note) 
        console.log("Note created")
    }catch(e){
        res.status(500).json({error:"Failed to create note"})
    }

})

//GET ALL NOTES 
app.get("/allnotes",authenticateToken,async(req,res)=>{
    try{
        const notes = await Note.find({userId:req.user.userId,trashed:false,archived:false}) 
        res.json(notes)
    }catch(e){
        res.status(500).json({error:"Failed to fetch notes"}) 
    }
}) 

//ARCHIVE A NOTE 
app.patch("/:id/archive",authenticateToken,async(req,res)=>{
    try{
        const note = await Note.findOneAndUpdate({_id:req.params.id,userId:req.user.userId},{archived:true},{new:true}) 
        res.json(note)
    }catch(e){
        res.status(500).json({error:"Failed to archive note"})
    }
})

//TRASH A NOTE 
app.patch("/:id/trash",authenticateToken,async(req,res)=>{
    try{
        const note = await Note.findOneAndUpdate({_id:req.params.id,userId:req.user.userId},{trashed:true},{new:true}) 
        res.json(note)
    }catch(e){
        res.status(500).json({error:"Failed to trash note"})
    }
}) 

//RESTORE A NOTE FROM TRASH
app.patch("/:id/restore",authenticateToken,async(req,res)=>{
    try{
        const note = await Note.findOneAndUpdate({_id:req.params.id,userId:req.user.userId},{trashed:false},{new:true}) 
        res.json(note)
    }catch(e){
        res.status(500).json({error:"Failed to restore note"})
    }
}) 


//DELETE A NOTE 
app.delete("/:id/delete",authenticateToken,async(req,res)=>{
    try{
        await Note.findOneAndDelete({_id:req.params.id,userId:req.user.userId}) 
        res.json({message:"Note deleted"})
    }catch(e){
        res.status(500).json({error:"Failed to delete note"})
    }
})

//GET NOTES BY TAG 
app.get("/tags/:tag",authenticateToken,async(req,res)=>{
    try{
        const notes = await Note.find({userId:req.user.userId,tags:req.params.tag});
        res.json(notes)
    }catch(e){
        res.status(500).json({error:"Failed to fetch notes by tag"})
    }
})

//GET ARCHIVED NOTES 
app.get("/archived",authenticateToken,async(req,res)=>{
    try{
        const notes = await Note.find({userId:req.user.userId,archived:true}) 
        res.json(notes)
    }catch(e){
        res.status(500).json({error:"Failed to fetch archived notes"})
    }
}) 

//GET TRASHED NOTES 
app.get("/trashed",authenticateToken,async(req,res)=>{
    try{
        const notes = await Note.find({userId:req.user.userId,trashed:true}) 
        res.json(notes)
    }catch(e){
        res.status(500).json({error:"Failed to fetch trashed notes"})
    }
}) 

app.get("/",(req,res)=>{
    res.send("Home page")
})

app.listen(1000,()=>{
    console.log("Server running...")
})