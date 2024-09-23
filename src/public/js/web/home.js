function verifyInputs(){
    let rolUser = document.getElementsByClassName('rolUser')[0].value;
    let nameUser = document.getElementsByClassName('nameUser')[0].value;
    let userEmail = document.getElementsByClassName('userEmail')[0].value;
    let numberPhone = document.getElementsByClassName('numberPhone')[0].value;
    let message = document.getElementsByClassName('message')[0].value;
    let otherRol = document.getElementsByClassName('otherRol')[0];

    console.log(rolUser, nameUser, userEmail, numberPhone, message);
    if(rolUser != "" && nameUser != "" && userEmail != "" && numberPhone != ""){
        console.log("Todos llenos");
    }else{
        console.log("Faltan campos");
    }

    if(rolUser == "Otro"){
        otherRol.style.display = "block";   
    }else{
        otherRol.style.display = "none";
    }
}