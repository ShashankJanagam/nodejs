

import jwt from 'jsonwebtoken';

function authMiddleWare(req,res,next){

    if(!req.session.user){
        return res.status(401).json({message:"unauthenticated"});
    }
    if( req.session.ua!==req.headers['user-agent']){
        req.session.destroy();
        return res.status(401).json({message:"unauthenticated hijacked"});
    }

    req.user=req.session.user;
    req.user.loginCount+=1;
    next();



  
};

export default authMiddleWare;