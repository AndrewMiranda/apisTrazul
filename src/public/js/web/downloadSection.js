function validateDates(){
    let userName = document.getElementsByClassName('userName')[0].value;
    let userEmail = document.getElementsByClassName('userEmail')[0].value;
    let numberPhone = document.getElementsByClassName('numberPhone')[0].value;
    let message = document.getElementsByClassName('message')[0].value;


    console.log(userName, userEmail, numberPhone, message);
    if(userName != "" && userEmail != "" && numberPhone != ""){
        console.log("Todos llenos");
    }else{
        console.log("Faltan campos");
    }
}


function sendForm(){
    
}