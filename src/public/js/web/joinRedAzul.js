
// tipos de documento
let typeDocument = document.getElementById('typeDocument');
let inputDocument = document.getElementById('inputDocument');
fetch(`https://${urlApi}/apis/${version}/general/documentTypes?flag=*`, {
    method: 'GET',

}).then((response) => {
    if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
    }
    return response.json();

}).then((data) => {
    // Suponiendo que el JSON tiene una propiedad llamada 'documents'
    const documents = data.documents;
    typeDocument.innerHTML = '';

    typeDocument.innerHTML = `
        <option selected disabled >Tipo de documento</option>
    `;
    // Iterar sobre los documentos y procesar los datos
    documents.forEach((doc) => {
        const option = document.createElement('option');
        option.value = doc.document_types_id; // Asignar el ID como value
        option.textContent = doc.document_types_name; // Asignar el nombre como texto visible
        typeDocument.appendChild(option); 
    })

    inputDocument.innerHTML = ''
    inputDocument.style.display = 'none';
})
.catch(err => {

});


function selectImageProfile(nameText, id, urlImge){
    let imgHeader = document.getElementById("imgHeader");
    let textHeader = document.getElementById("textHeader");
    let card = document.getElementById(`card-${id}`);
    let idProfile = document.getElementById("idProfile");
    let textProfile = document.getElementById("textProfile");

    imgHeader.style.display = 'flex';
    textHeader.innerHTML = "Qué bueno contar con el interés de acuicultores como tú. Ahora completa el registro.";
    idProfile.value = `${id}`
    imgHeader.src = `${urlImge}`;
    textProfile.value = `${nameText}`;

    let elementos = document.querySelectorAll('.selectedCard');
    elementos.forEach(function(elemento) {
        elemento.classList.remove('selectedCard');
    });

    card.classList.add("selectedCard");

    const element = document.getElementById("formRegister");
    element.scrollIntoView({ behavior: "smooth" });

}

// Ir al incio
function goTop(){
    const element = document.getElementById("goTop");
    element.scrollIntoView({ behavior: "smooth" });
}

function verifyPasswords(){

    const regex = /^(?=.*[A-Za-z])(?=.*\d)[A-Za-z\d@$!%*#?&.]{8,}$/;

    let password = document.getElementsByName('password')[0];
    let confirmPassword = document.getElementsByName('confirmPassword')[0];

    let errorPassw = document.getElementById('errorPassw');
    let errorConfirmPassw = document.getElementById('errorConfirmPassw');

    if(password.value == "" || regex.test(password.value)){
        errorPassw.style.display = 'none';

        if(confirmPassword.value === "" || password.value === confirmPassword.value){
            errorConfirmPassw.style.display = 'none';
        }else{
            errorConfirmPassw.style.display = 'flex';
        }
        
    }else{
        errorPassw.style.display = 'flex';
    }

}   

function viewPassword1(nameInputParam, classImgParam){
    let nameInput = document.getElementsByName(`${nameInputParam}`)[0];
    let classImg = document.getElementsByClassName(`${classImgParam}`)[0];
    let viewPassw = classImg.getAttribute('viewPassw');

    if(viewPassw == '1'){
        nameInput.type = 'password';
        classImg.src = "/images/visibility_off-24px.svg"
        classImg.setAttribute('viewPassw','0');
    }else{
        nameInput.type = 'text';
        classImg.src = "/images/visibility_24.svg"
        classImg.setAttribute('viewPassw','1');
    }
}

function sendformRegister(event){
    event.preventDefault();

    let idProfile = document.getElementById('idProfile');
    let formRegisterUser = document.getElementById('formRegisterUser');
    let password = document.getElementsByName('password')[0];
    let confirmPassword = document.getElementsByName('confirmPassword')[0];
    let email = document.getElementsByName('email')[0];
    let name = document.getElementsByName('name')[0];

    let buttonSubmitForm = document.getElementById('buttonSubmitForm');


    console.log('submit form');
    if(idProfile.value == ""){
        launchalert('infoAlert', 'Debes seleccionar un tipo de perfil para poder registrarte', 'Selecciona un perfil e intentalo nuevamente', '', 'Aceptar', '', 'alertmodalcomponentclose');
        buttonSubmitForm.disabled = false;
    }else if(password.value != confirmPassword.value){
        buttonSubmitForm.disabled = false;
        console.log("las contraseñas no coinciden")
    }else{
        buttonSubmitForm.disabled = true;
        let formRegister = new FormData(formRegisterUser);

        fetch(`https://${urlApi}/apis/${version}/users/register`, {
            method: 'POST',
            body: formRegister
        }).then((response) => {

            console.log(response);
            if(response.status === 200) {
                document.cookie = 'email='+email.value+';SameSite=Strict';
                document.cookie = 'name='+name.value+';SameSite=Strict';
                document.cookie = 'typeProfile='+idProfile.value+';SameSite=Strict';
                
                return response.json().then(data => {
                    document.cookie = 'auth='+data.code+';SameSite=Strict';
                    
                    goVerificationCode();
                    console.log("Se ejecuta");
                });
                
            }else{
                return response.json().then(errorData => {
                    // console.log(JSON.parse(errorData))
                    launchalert('infoAlert', `${errorData['error']['error']}`, '', '', 'Aceptar', '', 'alertmodalcomponentclose');
                    buttonSubmitForm.disabled = false;
                });
            }
        })
        .catch(err => {
            launchalert('infoAlert', `${err.message} ${err.cause.message}`, `${err.stack}`, '', 'Aceptar', '', 'alertmodalcomponentclose');
            buttonSubmitForm.disabled = false;
            console.log(err)
        });
    }

}

function goVerificationCode(){
    window.location.href = '/codigo_de_verificacion';
}

function viewTerms(){
    let containerModal = document.getElementById('containerModal');

    containerModal.innerHTML = `
        <div class="contentModal">
            <div class="closeModal" onclick="closeModal()">X</div>
            <div class="infoModal">
                <h3>Terminos y condiciones</h3>
                <br>
                <p>
                    Acepto y autorizo que miPescao S.A.S. (en adelante la “Compañía”), identificada con NIT 901.323.612-2, como Responsable del Tratamiento, recolecte, use, almacene, circule, transmita, transfiera y, en general, realice el Tratamiento de mis Datos Personales, de conformidad con la Ley 1581 de 2012, el Decreto 1074 de 2015 y demás normas que los modifiquen, adicionen o sustituyan. Acepto que el Tratamiento de mis Datos Personales se realizará con las siguientes finalidades:.
                    
                    <br><br>i.	Tramitar la creación y administración de la cuenta de usuario productor/pescador en la plataforma.
                    
                    <br><br>ii.	Contactar al titular productor/pescador para el envío de información referida a la relación contractual y obligacional a que haya lugar.
                    
                    <br><br>iii.	Supervisar y hacer seguimiento a la correcta y debida ejecución de nuestra relación contractual
                    
                    <br><br>iv.	Ordenar y catalogar la información del productor  para llevar históricos y hacer análisis de la dinámica del productor.
                    
                    <br><br>v.	Difundir promociones, campañas y encuestas.
                    
                    <br><br>vi.	Procesar información sobre la producción en cuanto a especies, tallas, cantidades, precios, métodos de producción y gestión, para ofrecer los productos en la plataforma y establecer el grado de responsabilidad ambiental que será informado a quien interese.
                    
                    <br><br>vii.	Para programar actividades de auditoria para revisión del cumplimiento de la responsabilidad ambiental.
                    
                    <br><br>viii.	Para programar capacitaciones de acuerdo con las necesidades identificadas en el análisis de responsabilidad ambiental.
                    
                    <br><br>ix.	Procesar la información de los productores para la gestión y formalización de negocios.
                    
                    <br><br>x.	Procesar la información para la gestión contable.
                    
                    <br><br>xi.	Gestionar trámites administrativos, formalizar facturas, pagos y certificaciones.
                    
                    <br><br>Reconozco que he sido debidamente informado que mis derechos como Titular de Datos Personales son los establecidos en la Constitución Política y la Ley 1581 de 2012, especialmente los siguientes: (i) Acceder en forma gratuita a los datos proporcionados que hayan sido objeto de tratamiento; (ii) Conocer, actualizar y rectificar mi información frente a datos parciales, inexactos, incompletos, fraccionados, que induzcan a error, o a aquellos cuyo tratamiento esté prohibido o no haya sido autorizado; (iii) Solicitar prueba de la autorización otorgada; (iv) Presentar ante la Superintendencia de Industria y Comercio quejas por infracciones a lo dispuesto en la normatividad vigente; (v) Revocar la autorización y/o solicitar la supresión del dato, siempre que no exista un deber legal o contractual que impida eliminarlos; (vi) Abstenerme de responder las preguntas sobre Datos Sensibles. Mis derechos los podré ejercer por correo electrónico siguiendo el procedimiento establecido en la Política de Privacidad, escribiendo a la siguiente dirección de correo electrónica: contacto@mipescao.com. Manifiesto que conozco que la Política de Privacidad de la Compañía.
                </p>
            </div>
        </div>
    `

    containerModal.style.display = 'flex';
}

function closeModal() {
    let containerModal = document.getElementById('containerModal');

    containerModal.style.display = 'none';
}


function selectTypeUser(){
    let name = document.getElementsByName('name')[0];
    let firstSurname = document.getElementsByName('firstSurname')[0];
    let profileType = document.getElementsByName('profileType')[0];
    if(profileType.value != "1"){
        firstSurname.style.display = 'none';
        firstSurname.setAttribute('disabled', '');
        name.setAttribute('placeholder', 'Razón social');
    }else{
        firstSurname.style.display = 'flex';
        firstSurname.removeAttribute('disabled');
        name.setAttribute('placeholder', 'Nombre');
    }
}


function selectTypeDocument(){

    inputDocument.style.width = '100%';
    inputDocument.style.display = 'flex';
    if(typeDocument.value == '9'){
        inputDocument.innerHTML = `
            <input class="inputFormRegister generalShadow" type="text" name="firstSurname" placeholder="Nit" required></input>
        `
        // 
    }else{
        inputDocument.innerHTML = `
            <input class="inputFormRegister generalShadow" type="text" name="firstSurname" placeholder="Numero de documento" required></input>
        `
        console.log('otro');
    }
}
