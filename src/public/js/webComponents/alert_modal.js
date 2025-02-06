// Componente que abre una ventana modal para alertar del exito, advertencia, alerta o error al usuario
// Creado por Milton Miranda Crtuz para miPescao.com
// Fecha: 15 de septiembre de 2021

/*
Modo de uso

En el modulo de importación (si está en la carpeta MODULES):
------------------------------------------------------------

import {createComponent, alertModalComponentClose, launchAlert} from "../../WEBCOMPONENTES/mipescao_alert_modal.js";

createComponent();
alertmodalcomponentclose = alertModalComponentClose;
launchalert = launchAlert;


En el js principal llamar a la ventana de alerta así:
------------------------------------------------------------

launchalert (alertIcon, firstAlert, secondAlert, textButtonGray, textButtonBlue, funcBotonGray, funcBotonBlue);

En alertIcon los valores pueden ser: "warning", "error", "infoAlert" o "success".

firstAlert es un string con el texto principal de la alerta.

secondAlert es un string con el texto secundario de la alerta.

textButtonGray es un string con el texto del primer botón (gris).

textButtonBlue es un string con el texto del segundo botón (azul).

funcBotonGray es un string con el nombre de la función que se ejecutará cuando se haga click en el botón gris.

funcBotonBlue es un string con el nombre de la función que se ejecutará cuando se haga click en el botón azul.

Si sólo se quiere un botón, dejar el sexto parámetro como un string vacío: "".


Pase 'alertmodalcomponentclose' en el parámtro funcBotonGray y 'Cerrar' en el parámetro 'textButtonGray' para que se cierre la ventana de alerta al hacer click en el botón gris.


En el HTML use la etiqueta <alert-modal></alert-modal>
*/

//----------------- Creamos el componente -------------------------------

export function createComponent(){
    
    class alertModalComponent extends HTMLElement{
        constructor(){
            super();
            this.attachShadow({mode: 'open'});
        }

        static get observedAttributes(){
            return["img", "altimg", "primermensaje", "segundomensaje", "textbuttongray", "textbuttonblue", "displaybuttongray", "functiongray", "functionblue"]
        }

        attributeChangedCallback(attr, oldValue, newVal){

            if (attr === "img") {
                this.img = newVal;
                /*if(this.rendered){
                    this.querySelector("img").setAttribute('src', `IMAGES/${this.img}`);
                }*/
            }
            if (attr === "altimg") {
                this.altImg = newVal;
                /*if(this.rendered){
                    this.querySelector("img").setAttribute('alt', this.altImg);
                }*/
            };
            if (attr === "primermensaje") {
                this.primermensaje = newVal;
                /*if(this.rendered){
                    this.querySelector("modalMainTextH").innerHTML=`${this.primermensaje}`;
                }*/
            }
            if (attr === "segundomensaje") {
                this.segundomensaje = newVal;
                /*if(this.rendered){
                    this.querySelector("modalMainTextP").innerHTML=`${this.segundomensaje}`;
                }*/
            }
            if (attr === "textbuttongray") {
                this.textButtonGray = newVal;
                /*if(this.rendered){
                    this.querySelector("buttonGray").innerHTML=`${this.textButtonGray}`;
                }*/
            }
            if (attr === "textbuttonblue") {
                this.textButtonBlue = newVal;
                /*if(this.rendered){
                    this.querySelector("buttonBlue").innerHTML=`${this.textButtonBlue}`;
                }*/
            }
            if (attr === "displaybuttongray") {
                this.displayButtonGray = newVal;
                /*if(this.rendered){
                    if(newVal == 'block'){
                        this.querySelector("buttonGray").classList.replace('buttonGrayNone', 'buttonGray')
                    }else{
                        this.querySelector("buttonGray").classList.replace('buttonGray', 'buttonGrayNone')
                    }
                }*/
            }
            if (attr === "functiongray") {
                this.functionGray = newVal;
                /*if(this.rendered){
                    this.querySelector("buttonGray").setAttribute('onclick', `${this.functionGray}()`);
                }*/
            }
            if (attr === "functionblue") {
                this.functionBlue = newVal;
                /*if(this.rendered){
                    this.querySelector("buttonBlue").setAttribute('onclick', `${this.functionBlue}()`);
                }*/
            }

        }

        getStyle(){
            return`
            <style>

                :host {
                    margin: 0;
                    padding: 0;
                    box-sizing: border-box;
                    font-family: 'Quicksand', sans-serif;
                    text-decoration: none;
                    color: var(--gray1);
                }

                .modalContent{
                    position: fixed;
                    width: 100vw;
                    height: 100vh;
                    top: 0;
                    left: 0;
                    background-color: rgba(46, 50, 147, 0.7);
                    display: flex;
                    justify-content: center;
                    align-items: center;
                    z-index: 101000;
                }
    
                .modal{
                    background-color: #FFF;
                    width: 88%;
                    max-width: 480px;
                    border-radius: 10px;
                    -moz-border-radius: 10px;
                    -webkit-border-radius: 10px;
                }
    
                .modalMain{
                    width: 100%;
                    display: flex;
                    justify-content: space-between;
                    align-items: flex-start;
                }
    
                .modalMain img{
                    width: 33%;
                    height: auto;
                    border-radius: 10px 0 0 0;
                    -moz-border-radius: 10px 0 0 0;
                    -webkit-border-radius: 10px 0 0 0;
                }
    
                .modalMainText{
                    width: 60%;
                    padding: 18px 18px 0 0;
                }
    
                .modalMainTextH{
                    font-size: 18px;
                    font-weight: bold;
                    text-align:right;
                    margin-bottom: 25px;
                    line-height: 1.5;
                    color: #707070;
                }
    
                .modalMainTextP{
                    font-size: 18px;
                    text-align:right;
                    line-height: 1.5;
                    color: #707070;
                }
    
                .modalMainButtons{
                    width: 100%;
                    padding: 16px;
                    display: flex;
                    justify-content: flex-end;
                    align-items: center;
                    box-sizing: border-box;
                }
    
                .modalMainButtonsButton{
                    padding: 8px 18px;
                    border-radius: 20px;
                    -moz-border-radius: 20px;
                    -webkit-border-radius: 20px;
                    color: #FFF;
                    font-size: 18px;
                    font-weight: bold;
                    border: none;
                    cursor: pointer;
                }
    
                .buttonGray{
                    background-color: #C8D3E3;
                    display: ${this.displayButtonGray};
                }

                .buttonGrayNone{
                    background-color: #C8D3E3;
                    display: none;
                }
    
                .buttonBlue{
                    background-color: #62C2FE;
                    margin-left: 25px;
                }
            </style>`
        }
    
        getTemplate(){
            const template = document.createElement('template');
            template.innerHTML = `
                <div class="modalContent">
                    <div class="modal">
                        <div class="modalMain">
                            <img src="/images/${this.img}" alt="${this.altImg}">
                            <div class="modalMainText">
                                <div class="modalMainTextH">${this.primermensaje}</div>
                                <div class="modalMainTextP">${this.segundomensaje}</div>
                            </div>
                        </div>
                        <div class="modalMainButtons">
                            <div class="buttonGray modalMainButtonsButton" onclick="${this.functionGray}()">${this.textButtonGray}</div>
                            <div class="buttonBlue modalMainButtonsButton" onclick="${this.functionBlue}()">${this.textButtonBlue}</div>
                        </div>
                    </div>
                </div>
                ${this.getStyle()}
            `;
            return template;
        }

        render(){
            this.shadowRoot.appendChild(this.getTemplate().content.cloneNode(true));
        }
    
        connectedCallback(){
            this.render();
            //this.rendered = true;
        }

        disconnectedCallback(){
            /*this.render = false;*/
        }
    }

    window.customElements.define('alert-modal', alertModalComponent);
}

export function alertModalComponentClose (){
    document.querySelector('alert-modal').remove();
};

export function launchAlert (alertIcon, firstAlert, secondAlert, textButtonGray, textButtonBlue, funcBotonGray, funcBotonBlue) {
    
    let alert = document.createElement('alert-modal');
    let attrImg;
    let attrAltImg;
    let displayButtonGray;

    if(alertIcon == "warning"){
        attrImg = "alertMiPescao_warning.svg";
        attrAltImg = "Imagen de advertencia";
    }else if(alertIcon == "error"){
        attrImg = "alertMiPescao_error.svg";
        attrAltImg = "Imagen de error";
    }else if(alertIcon == "infoAlert"){
        attrImg = "alertMiPescao_infoAlert.svg";
        attrAltImg = "Imagen de información";
    }else if(alertIcon == "success"){
        attrImg = "alertMiPescao_success.svg";
        attrAltImg = "Imagen de exito";
    };

    if(funcBotonGray == ''){displayButtonGray = 'none'}else{displayButtonGray = 'block'}

    alert.setAttribute('img', attrImg);
    alert.setAttribute('altimg', attrAltImg);
    alert.setAttribute('primermensaje', firstAlert);
    alert.setAttribute('segundomensaje', secondAlert);
    alert.setAttribute('textbuttongray', textButtonGray);
    alert.setAttribute('textbuttonblue', textButtonBlue);
    alert.setAttribute('displaybuttongray', displayButtonGray);
    alert.setAttribute('functiongray', funcBotonGray);
    alert.setAttribute('functionblue', funcBotonBlue);

    document.body.appendChild(alert);

}