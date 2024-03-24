document.addEventListener('DOMContentLoaded', function() {
    const uploadForm = document.getElementById('uploadForm');
    const apkFileInput = document.getElementById('apkFile');
    const versionInput = document.getElementById('version');
    const hashInput = document.getElementById('hash');
    const submitButton = document.getElementById('submitButton');

    // Función para habilitar o deshabilitar el botón de envío
    function toggleSubmitButton() {
        if (apkFileInput.value && versionInput.value && hashInput.value) {
            submitButton.removeAttribute('disabled');
        } else {
            submitButton.setAttribute('disabled', 'disabled');
        }
    }

    // Event listener para verificar los campos y habilitar/deshabilitar el botón de envío
    uploadForm.addEventListener('input', function() {
        toggleSubmitButton();
    });

    // Event listener para validar el archivo APK
    apkFileInput.addEventListener('change', function() {
        const fileName = this.value.split('\\').pop();
        const fileExtension = fileName.split('.').pop().toLowerCase();
        if (fileExtension !== 'apk') {
            alert('Por favor, seleccione un archivo APK.');
            this.value = '';
        } else {
            toggleSubmitButton();
        }
    });

    // Event listener para validar el número de versión
    versionInput.addEventListener('input', function() {
        const versionPattern = /^\d+\.\d+\.\d+$/;
        if (!versionPattern.test(this.value)) {
            this.setCustomValidity('El número de versión debe tener al menos un número seguido de un punto (por ejemplo, 1.0).');
        } else {
            this.setCustomValidity('');
            toggleSubmitButton();
        }
    });

    // Event listener para validar el hash
    hashInput.addEventListener('input', function() {
        const hashPattern = /^[a-zA-Z0-9]{7,}$/;
        if (!hashPattern.test(this.value)) {
            this.setCustomValidity('El hash debe tener al menos 7 caracteres alfanuméricos.');
        } else {
            this.setCustomValidity('');
            toggleSubmitButton();
        }
    });

    // Event listener para enviar el formulario
    uploadForm.addEventListener('submit', function(event) {
        event.preventDefault();

        // Crear un objeto FormData para enviar los datos del formulario
        const formData = new FormData(this);
    
        // Realizar la solicitud fetch
        fetch('apis/dev/general/loadUpdate', {
            method: 'POST',
            body: formData
        })
        .then(async response => {
            if (!response.ok) {
                let data = await response.json();
                throw data
            }else{
                // Alerta satisfactoria
                showAlert('Actualización subida correctamente.', 'success');

                // Limpia los campos después de enviar
                this.reset();

                // Deshabilita el botón de envío después de enviar
                submitButton.setAttribute('disabled', 'disabled');
            }
        })
        .catch(error => {
            console.error('Error:', error);
            showAlert(error.error, 'error');
        });
    });
});

// Función de alerta personalizada
function showAlert(message, type) {
    const alertContainer = document.getElementById('alertContainer');
    const alertDiv = document.createElement('div');
    alertDiv.className = `alert ${type}`;
    alertDiv.textContent = message;
    alertContainer.appendChild(alertDiv);
    // Ocultar la alerta después de un tiempo
    setTimeout(() => {
        alertDiv.remove();
    }, 5000); // Después de 5 segundos
}
