# Reglas del Monitor LIMINAL (Señales)

- La etiqueta "Último momento" (`"ultimoMomento": true` en el JSON de la edición) vale 24 horas contadas desde `actualizado` (hora de Montevideo). Cada actualización de la señal la renueva por otras 24 horas. Pasado el plazo, la web la oculta sola y muestra "Actualizado el" (lo resuelven `umVigente` en el build y `src/scripts/ultimo-momento.ts` en el navegador). En la siguiente intervención sobre el archivo se borra la marca; la señal, su número y su `actualizado` quedan como están.
- El título no convierte en hecho una afirmación sin confirmar: si el dato es una declaración de parte, el título lo dice ("sin confirmar", "según Irán").
- Las reglas de fondo del Monitor viven en la skill liminal-monitor del proyecto Monitor; este archivo repite las que tocan al código y a los JSON.
