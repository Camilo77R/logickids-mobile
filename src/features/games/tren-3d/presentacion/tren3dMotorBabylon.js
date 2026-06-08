const serializar = (valor) => JSON.stringify(valor).replace(/</g, '\\u003c');
const FONDO_TREN_DATA_URL =
  'data:image/avif;base64,AAAAHGZ0eXBhdmlmAAAAAG1pZjFhdmlmbWlhZgAAANZtZXRhAAAAAAAAACFoZGxyAAAAAAAAAABwaWN0AAAAAAAAAAAAAAAAAAAAAA5waXRtAAAAAAABAAAAImlsb2MAAAAAREAAAQABAAAAAAD6AAEAAAAAAAAYLgAAACNpaW5mAAAAAAABAAAAFWluZmUCAAAAAAEAAGF2MDEAAAAAVmlwcnAAAAA4aXBjbwAAAAxhdjFDgQQMAAAAABRpc3BlAAAAAAAAAuQAAALkAAAAEHBpeGkAAAAAAwgICAAAABZpcG1hAAAAAAAAAAEAAQOBAgMAABg2bWRhdBIACgoZJm47j4ICGg0IMp0wTGAC9LqpGf737CcAOrP6dtwsBGAgWaFbvtJhLS+BAyyBTRZIKyTkIfbz6ZDViqqzOdDMoNb9xv7JaCZ0+3gXwVJ4r8qq8J69jjPRQ1jhW06AexQooThIHdCW99k/Kwpy6ecYJQ6/pOIMSQBt9lwqAbbH4o7K2JNAPoIa64UWzXx+DNjvsl/ykvVziiAtr0a9pjj2W7ifHLnxIz07aXKLQ0dU1jGp/hCYJRhiJeMJGeBmQvb0Qpkx0N7C+mTN8xmKS962dQEECTXjtTA0oXLold9tBwA81mh5Zvu69fJMrazJCdlRJCY5ZdDcmKoDlqUsThOo4V7EtMMKBavrjUX3ygTl5RemT1pArrqjcqsH/790pBa9CwEb13pkl0367dDRBT6Qv4F96d0HYVxVSJp3KUY6TN9h3K59/60eJUQymlOMV9QWpdSbcJID+zq1YnjFtlhAafjHs0aPZqADc4d0KCD12FWNepkutyS0a18FOD0BlVFPQiOQum745DqnxRtv/ZMKD7/dI2LwSoyqXrHYKb9wtOt5BzeC7xfxDzd5ZyxktthoXY8MbRuXNwEcYfiisDyOH/UNEL3BU78gmZm2w5zWxkL0nYoOVAE363iR/cB6rK1UJHUXw5uADzxYyUoexd+GBT4fW2WRt1lhiHCi5KzZlPxTOJbMJ8WLThn3vn0rdKdrbk++tvYjiQZMEojNc/pQvY9U1UF0JpBfEiKiYdFGWH9ZwAm+vNbm+q3TDpcghYC2j9aVj2tFw60IdWEFH1snICt5Pw+oU/4HvHyr4RrLY10zY1ECHc+QgsN5S3tkQ/CS3NczLVq7KPsTmf9/DoRybqW/KR10gA7ZUq8+av49OwJEEir+N+B2HudwQVF6QPGvPG+xYoy0f6COhUcwyHwHXuZe25TrUIZin0mW6o009lCr/HPQxDicL56GBBvU8LvbpIjyMCEFdifQ9QJIA1+z9h0EYHvaXNRHqhyez7Vl3yuzW9SN4C68oD9NB5UBURND0YIVzJtm8pM4j0oOXqnuQ5mLlRZ9YFuA/c9//xcvoqdjHRdFZ/Qh8Hj0dzwU2kQ2ekhT1oWQzZPFiN5EYDgaUj636kk5fP5zljs31lo/J/Dk84t3kmtIru4dVL1V1dKtgYBELs/XGO4QKVuRSdkpDcRLl2gV4vDk+eBxtRKpIH7hYWnGcWLhnAtB3Wt+sL7ZGSSclIRqcFVQvUIRzGJp7SrN648+BVynDMYku+sSn5yN7uXnfvnMW1pVaqBwPrtrBqDk/sAAyAmJ7NmP75s9CEEg9tXPxkR6St6uDqm7SyNfSO019QLU9L0ox92L+ibXzMK5ot3lSzDcBxbIxP1L0KxKrf2daVCGEqDO7x4bOaai4O3lEWdOQ23T0pBkwNtgaovVLdGgzkjdIVenaIJML+HVOhlCDg/YfE5GDf8HN5Zt0SVcZ54PqTDAAwC9c0Ze86TyOGSZHT74F5q6I7/lw7+O8Hkq63HXxGU9jupxhC9aFBy9xV/NT6Xwk8mSYZ/D4bw7CG1VfsyIp2qeS+8goB/KJAphkm0FrY1O268eMNG6gS9izBrwCkZUjM70W5RCaRaOgR58Tl6rL/Lqn/oxlv3sBgKoeLTEo7rwAIP9XzJXPbHYydLySCs2dYRY/xyhaPcK0n2EYOcdVd2Giqli83kz1hJYmj49lJX/PCCV01GQzTEDScIwcPDz9NqX14qFwMezPmb77BBWT9VnWEbfNQv3CJErGMhFgTOdRXodtNJKmYVgo4+uMnuTEVBg5tuT/FHSJQ7cQcWzJRxSAzgYn2p8EC+RARGrGJeYF3PDhItOT62EU/03HRM7JHTWRCVDXYqkyPzOw+M5mF4rtXiGTW2gKJT4lO6vqTn6iAYoS17GYx2qIzesu6KL1sGYfAbTyrB6f+OQcTuPmar8T3a4s3S73VXNuQQ3v//1NbGCZqe3XGvMbn82zZW9UmOUdWS4u5e07Mz8t5ORaoAEuIySr6HPG2ucwiATiPv5VmoXUFjBcZGVMmUbJwEY7LmDPD/173MEu2dyiMBdJ0gS4w4wzdKsYydpg5u07HKGEOPR+J4muk7vmIi1HeXCBLjZE+jmf0RO2RtlOuPTqbnPJSlg8DUotrji1Ca1Hl4LLfouINWp5M33XQqOgZsfXmJWRIoU3xemzmOgt2a9cZaNP98xaE5qq/TWCdK7EidW3s9rrUyJ105dATwgPyZZJaue0mpikCB8EEf1v+tgufDQE63zqPDZltRzr29vKk/CQBPGoT1gO8QllBreW4q5IoEJHlLH9lI18FUqY5gu6DdGpwazbH+W4BxN/Hxw8EmNCFIUGP+yhNwklWxiXdRI/1MiqH1QvyYufxKl0Ovxs/EH+1CgjGrCVi/OpMxBMMMU06Aeg40rL7XJeoHhMNJQyEjXLwNuQrBGCDrXekfFZqD4Yy7U698wlPlyhJyu6pDbOGIGUWQa5njkyWtzrlmijTwWula6buJenK36DzsQjX20X/kuxOXHJ5JH9Z/YYXh5jR/rH0TqyE3S4Dn4tFZMYPlqsvfmN3lEldSl5mV6GHQOm85WYrKvWbhKs2AzU58Cw0JhsAzSnRN9SUkTLUYIk3v0lBoaES9xXAQ+iIXOcnoeGZ9NuRR7KyFgEui2wokjBT5MWJ0ar5gwWx/8/9AoGP+pY5dQvYEqwqwpH2KGMf6bThfCk7ZUtK62TWHcHiJAsUzhbdyOvv9PJVuhq3jR3lWfqmPAyiiKeD/WIoxgmTzG2Q1nYIMT2AUKX/2fxyIQAVSdKF4Jm60zRiBrIgzixK22mWCqXHmLJTmDWHULlGV1JJNBLRnQVVxuhD2CqdMJj6AziYZ5eLSPmE6ZyRhOXJOUJBmPAzDTTXJ0WMhlp3aXECIH7YWREI20u+X0VXOMRn6Knfj6znDk+OOcRxvRm5gf5tZ60qd1nRuNj6VnztXFEBptgmp1KOZ4jluQZ8LecDzwGViIcjd0z0m6Qs32D8pQ9Oubcfu9PpzAxkfU5vzr7zsShEbR7GaIdBiztJFZYFFOapB5expllbcYPPtrRPhCE2hphCSaFXqKZdaVeEfzE8fQaOPdwNi65Rv6UknmZ8u8hEKAr3c7Vyh9spzbwPMSAgZHEe/tX99fDS6cOOl0V89yYPLL04SpjeSOHit1qA24Y9zxNLAuW45qWPxql8BI3z0vYuBa4tXgwe21RBCa6NcoCMJPqM+sUVDHhoHAtqkV1AdDubkEj9XuPi7AZFi/Q+hhGqH19Yi8tkUp+QTJb35bGizCLxls0PMPV9Ujoh/ea1cGDAgeK9c81It1JssJWhdpnlfesnuFqJyNpaFUsENSFdrHUnRwa4e2a2C865p37VUSngNYdB4PeQA1wUK53hxXXXSuR2N6jrBwpa4kUqsdnkFprN01kd2gEc0/fqrB8Cqwp0QygDM9c/eND5vCW56VRijiAH8tqyvKAjZTVU5LyheXLN0uQ3ZaoUwk2p5MOdJrdyU5qj1ZBFkLZUSowN9Ofev3PVq3bBqLJTlBI/Q9pCvia0z3hm8uTR3MEIxxpDWWQqeCXHFqtCIQ0Trimx0fYP61apYwP/NDS3deeuUyMoOA2b4gd51FWPsf+XYjYQ/EusahD3ck0NRtqwcF4FZk54tQEbNwGQuemyh/Q3aCmOAzNWf2ejsoyvSDTGH99sW/p4TUGwhD1lN+Nt7PnyOqaDb+w4BnLZh8hHsHC3AwnBtMX+e2nJsU6PQXIV/kP60WGn8C9a7UBAsRVtn/da5jfXlkHjIL3sIk2MybZCKZknb88IjHVjX0uxW2imU9p8/H+puMvnIIETfa9BuNruQVVmkwxWBOHmsPg9IuRbp3zaRj+LyCTsyLiE4p1ExGq0FkpiVwhm0Ld25k91jrU4Spvnlt66kY6ceDqzhRJWNvzm/WuVl28dVqU64kGgC69RJpvFYgLJQ4L9YhtadjpMCYXAMrqSlFyhT6fZJwmhvvrrUwf68RfxYFiI/NE58Uarr1SdxXhwN0ZSBAwhpKehpT5VT2n82X7GASMpEP0CU4PGhQeas7ggt0kyDTEnvR/yo3Bpv5EAK3ioHnzw+V2HiHYhcSIlLJZcop075aUPwiASJnUHFG2HITRpluco5hsc6ZgPdKSyvKYsYDGc+5tmDRbp1sv2n9CAU6EEhM+to7/b5+cdibEnWiTAZsWADlGtdS+vSQ5FzGhmvoAMDG6QtUaUkrd0swX83bQz76AXJhgPaUMObJqhHgXhFCvYEZd6nlo5Kvy7xtnRXjt+tRiuHHVixmqj8SZ3prHE+yzArPJd7yaIN57tqEmeZ4VvlJz8JxiRMBuVLkLeZsZopm8J/8NRRfUfvm9RYn60w07yzQKuayxEmDsingK7Lc4xD7POSzBButfXTSpRPp+MrfzBv5bqngHh/K12Zi3aI21PxwH147AuOwURQdojzs544MBlie+lzKDu/5PnN9+7fpzYBU98pdfWzBzl+8W+aujjWqJqNVGLJaNkupHUwO03KFCrqlMmcVPnfN6rHLHKJyeqTVOIVwOuh/GV7hZ3t6bdXpsGXre/iWNjoBAZZ8b5uh8wAMKniY0zHQo0yP7ZRn45ReE6fbKEH7nZndDrAH3uluhW2Y03KHQxjdd0jVkI2CMp99wJIFOzF6h+jQzxvGNTkhXuyuaZtRLqgS1mfxnivW1Y3ttV5djnBlbwD1fRxEE05GM8FSm5aJ/+0NJW0ItCQSfSmG6LWuzv+1Z////MYHycJOKr+pz+wMnMKreyuhbANh4vPy8KeNi0sYbSqVJKPLfn8weHs6Qpaq+VPmrf57PaQftvW9l2LvEWdf28USWPcTFLWvkYzOhi9qSUvgJYKIkmIga9XsIu5oxl/rCJiJeFPywoCByA9N9t4j/2OLQfuiGXGOr8GSHjuujxyNEHDYTNTD3SIsX5qQFuehASjJp1qjVknQd/MP03Oojr3tQgd+Z4uO2KwIPgN4eixcqdLXEFiarOriXPL4nR1pv/3OhCcVIt7SsmUeWUPj12g5d2ikMH0jEbJazWKzVwZF3nsjUufwI+6LBZJxMhvv3K3jnoYXD1QQb40AWS3qDMISaKLXgsHm9OXzbQsl7JpCBL6P8XYGxYxHxivSaE7gjS2TuJxy6/9Ha14NQTZiqkxHZcCgaqf+skWKnKr4jc2aUtIWzhEG//CiaQ7jKZ3UVibD48GT2hnoRzW4fYabCnFdmd5D7fb7crVNwixPwTLRdiRs9d6IlF2MeMdPEtVgHbxYStWtoxW2MQNoFdkEHVgOJMzFa/cDYPWGH57lQgInmMy/hEUk7BCi4Mq+eVYQKLnHoQJ8oLbJJUON+KMKhK5W/2W0IJrxodytet/5jMDJbgB8PR7zEf6anYW9MDkX040yqQVWAndgXRbNoNsf90yflcyVLMBHn5eI1OCUyJVrR0VYbLrxufA6LiUWUykVtsaJDmDwxziJ5SBS/Hq55suV6UG07+Uu5Tm7e8NT/Yn2OLwVD6Q3Dl5OqJgyhDtMyPCldZ0EnL3aetDUr/LGR8mI8u4ZppCScMBgOUtiHa0R8qC8qBpYaPsGmhs7CvobcgNstlOxRyyOskOxGNyRK4cWAWdROYCzMLFDYUQi5S3hvvdioaFDKzhAsYxDvS1gISAepv8kgslppff4EKVfS0tCEaQEc7Uef5/XHTueUjmJbfGM6I69LnOSOpUVu3RB9cTkcrZolVnPHa+azXgTSKX1VcaDklCi6Om1kIyR0qQKw0VTnKyrDqfHdgf6NzFNHGXHesgI1BWONDvRrEVJccdpE7bWz9SnaBGQ4cvNWOuwTVKqgNXEN2bG/Otdnv4YCtD6R/Gag9WDndXPgjeL1i1NZMQNWPXJmscO0vDyHR0LsIuQIBl7AbF+SxjJwJsrDBE5AgylHmHd3IRMxRH2Jkj7hnNRykITPZXw5DrM1q0uIMWGfRUr71hXFXzcjNb1Sy1TgTDcUtKBak2C4OCuWH+45+enTVwTU8QjImEjO7r0iLOu5xVDh/0XF0nqIHIL/Ife3+5M9f5ZpCIeH5vuFas2cAyB9557fN2XIJjwrBWAgtTjkR9UameDLt4gqAxP5/kueLPeoeIL5UWITr45TESV7b9a3kuujmPZsxfXoM9+OuwejBCJlFy/85D/uXziIeK00WEd9sqW1er8ffClppv0hejFcTJwvizwwW2kEpDHkuNZBxTLjvDuYwMgKl/SI6WzI8g7dYFgdSDvQ3xwjYqLXgc4qLTjmdy7cIYINTqlHVbMj/Pkc4qZ6JS4qsl8MoHcU9EqoRhgK3d5BSatUwsoMlLh189uzkZkY8wiU23L7GFA//vfQkdkSuPEtHNMzMQVHhlKCDtiVHvg0kmjSd0qRGZDHZCyULUKpx1qSwaTpx1tJoraixO1//hQBIFTdRq6B7c0n+N/j7vvM4J3xHyZULoZhkZDNGaf6cC2n7QX4IiqOb0a3qixGuPIsu0YyLfmNZlOK+PuZW2yvRNaFht2r7F+mHWAAE4JnIUId59q4V7njdTMVUBOYNTBbZmrO4yvMTBtzgRg5VFrj3QR0O++zH3qgtTZZ3Mw96fpeNMKNv350lCldTsb+Uv/iRwz7/m2unvvdshy+u/O7niKt3aahzF5zcBm5T5rLIEqoMPtWaXOTk07REiqnEqRYw/szdTliOAZHWHl+vQyVOTZ5BuXcItKYuk2cJW6ksQWdlwwXIn3NWF4pxZ8UKTh2fTE9eYpDlG5AH1Mj4TmapOfo5rbP811le48D57jUSIOm0Tpu2RbGgPfJWOnoXLceCgJR5J45GPLZmjz9JX2mS0HLuJ5XeLeh/yvJQYpqEVIgv3LvpABcrgbnJJjQYTtsAzUdxQMSObr1DAZ0KpYx8Xy+DzLLQp8MSnNRz2iqB3ciuHptcp95wYosoK6MQqoKtLahyRbtaotu1fcfm8ZxAUfwG4YUBMmCxhF7xZ8zgKYGHOa02ft9YAbzVKzffFy2G0nZOxxuifgww8AMfeJJ70OCdOi7JybXeD3CRp0s6WVyDwK3FPO3HgN9lMriOyX2sqvEwwpW6h/4EEdOGivIJ5Y7RqBd10VulJNqmVJFiBTzWjbdFhZ5OWvhxuF4CDB8ojk0rZ4AA42F6BHIL94zJaghLefMM7Ww7fLH7aUbP//8Q1//7OIeRsPdXl8JdwHR6LWkYegtyM2hWQrVDBDLpmDCWUxdZhWwG9Uj9F6ovTL6/lXorqdL47puTnpBLWMLH0aHnIi9+yuOms13GLx40o4X/2i0+/NhJbFD7oglSeejzcuCqRnb5CqwxdecQ81CYk1WEnWud4GYajEm+jKTGjrGLDAdk4YKkRHOW2IQ432wQlgieKICG9vusWIIWkqQN0WEpGrYtVIU8rEfA3QWtNJjxA5n9ODKami6Kpg9Dkh+Ze1yx+3MurjxNXOvRDDVFRh1wkJw0ESMeNREbruDtJHuELkGA/qYFdPWzgbKwyS6gKBO6snVuXEFFM4frl/UxnJG789bvu+FJ+8+HEDbJ0Pic/bh3oWzePsvSebolZTW8g9tghOo33kOBexm9u3NoJNOGquyJJyK+/9K2mDwj9KIqM6E2Wic4jiy5yjow5Rjm8B8Z5fHkXjHvuGEB96AvtpVVB5PM/g3mEznaxaDTRwNl/Qwkx+frNiv+h/8v8I+G/CnniFf0TWh2PPzRq2HwyKfMzwTtSKAywHQVM95OYgMFXVBG77H8CqXip1KitrWnEViNCKXSZidCJXXSsYjlWkPyL9jziYip4YjutD/Q1yMaMUp/8pYOlsmM7/TX3MVWCf2hR2NbgIKmjEyZ6ReNHeidGUIADOPViJ49YTVFFkHzjF4BCBeJ8hibXsLRxWj5FVdpj+8XYe/vdD2XrTS9RRq11ao8ce3ATe63em20VnQP7s7EOEn7VFB3aHjjnHkTOYCJ/UoCiUIxPGw+qRuhMQ54oOQhWPTa5MSIv4slp2aD4hu3YspGqAyrA2Re/TnbB3ub7nII0dD1om6l9nNDik1zPB0F2WVCyMSUQaXHoPlrnBPQwtyB8R5xMCM9ml/ry3L7K41+NUF9fWtdYg4nI9NEzvDdbmWwq//OO0xBmOVahVaburg1Kyc31b9PO7YF8f8MwI0e9sgsBKX5Y2K24hNr9cdcpd//28C76rjIYxzpDpP4IvK3t/Io4DkFAxmG8Cvh7DhY9LxL6zKzpTTpuLrbW1Cwiide6s/aD6shiH9tRFakowzDanDH3T0xY=';

export const generarHtmlMotorBabylon = (parametrosIniciales) => {
  const parametros = serializar(parametrosIniciales);
  const fondoTren = serializar(FONDO_TREN_DATA_URL);

  return `<!doctype html>
<html>
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width,initial-scale=1,maximum-scale=1,user-scalable=no" />
    <script src="https://cdn.babylonjs.com/babylon.js"></script>
    <style>
      html, body, #renderCanvas { width: 100%; height: 100%; margin: 0; overflow: hidden; touch-action: none; }
      body {
        background:
          linear-gradient(rgba(143, 215, 255, 0.38), rgba(114, 198, 106, 0.18)),
          url(${fondoTren}) center center / cover no-repeat,
          linear-gradient(#8fd7ff 0%, #d8f5ff 48%, #72c66a 49%, #3fa55a 100%);
      }
      #renderCanvas { display: block; background: transparent; }
      #fallback {
        position: fixed; inset: 0; display: none; align-items: center; justify-content: center;
        padding: 24px; color: #fff; font: 700 16px system-ui; text-align: center; background: #06131f;
      }
    </style>
  </head>
  <body>
    <canvas id="renderCanvas"></canvas>
    <div id="fallback">No fue posible cargar el motor 3D. Revisa la conexion a internet y vuelve a entrar.</div>
    <script>
      (function () {
        var parametros = ${parametros};
        var canvas = document.getElementById('renderCanvas');
        var fallback = document.getElementById('fallback');
        var engine = null;
        var scene = null;
        var vagones = [];
        var grupoTren = null;
        var estadoTren = 'entrando'; // 'entrando' | 'jugando' | 'saliendo' | 'nivelCompletado'
        var inicioRecorridoX = -12.0;
        var finRecorridoX = 12.0;
        var estado = {
          patron: [],
          dificultad: 1,
          velocidadTren: 1,
          completados: {},
          totalCompletados: 0,
          aciertos: 0,
          errores: 0,
          combo: 0,
          comboMaximo: 0,
          inicioNivelMs: Date.now(),
          ultimaJugadaMs: Date.now(),
          nivelReportado: false,
          seleccion: null
        };

        function enviar(payload) {
          if (!window.ReactNativeWebView) return;
          window.ReactNativeWebView.postMessage(JSON.stringify(payload));
        }

        function color3(hex) {
          return BABYLON.Color3.FromHexString(hex || '#ffffff');
        }

        function material(nombre, hex, emissive) {
          var mat = new BABYLON.StandardMaterial(nombre, scene);
          mat.diffuseColor = color3(hex);
          mat.specularColor = new BABYLON.Color3(0.28, 0.28, 0.28);
          if (emissive) mat.emissiveColor = color3(hex).scale(0.18);
          return mat;
        }

        function crearNube(nombre, x, y, z, escala) {
          var partes = [];
          [[0, 0, 0], [0.32, 0.08, 0], [-0.32, 0.05, 0], [0.08, 0.2, 0]].forEach(function (p, i) {
            var esfera = BABYLON.MeshBuilder.CreateSphere(nombre + '-' + i, { diameter: escala * (i === 3 ? 0.42 : 0.52), segments: 14 }, scene);
            esfera.position = new BABYLON.Vector3(x + p[0], y + p[1], z + p[2]);
            esfera.material = material(nombre + '-mat-' + i, '#ffffff');
            partes.push(esfera);
          });
          vagones.push.apply(vagones, partes);
        }

        function limpiarEscena() {
          vagones.forEach(function (m) { m.dispose(); });
          vagones = [];
        }

        function crearFigura(tipo, nombre, posicion, escala, hex) {
          var mesh;
          if (tipo === 'circulo') {
            mesh = BABYLON.MeshBuilder.CreateSphere(nombre, { diameter: 0.72 * escala, segments: 24 }, scene);
          } else if (tipo === 'cuadrado') {
            mesh = BABYLON.MeshBuilder.CreateBox(nombre, { size: 0.72 * escala }, scene);
          } else if (tipo === 'triangulo') {
            mesh = BABYLON.MeshBuilder.CreatePolyhedron(nombre, { type: 0, size: 0.58 * escala }, scene);
          } else {
            mesh = BABYLON.MeshBuilder.CreateCylinder(nombre, { diameterTop: 0, diameterBottom: 0.8 * escala, height: 0.7 * escala, tessellation: 5 }, scene);
          }
          mesh.position = posicion;
          mesh.material = material(nombre + '-mat', hex, true);
          return mesh;
        }

        function crearVagon(paso, indice) {
          var x = -4.85 + indice * 1.02;
          var completado = !!estado.completados[indice];
          var seleccionado = estado.seleccion && estado.seleccion.clave === paso.clave;
          var base = BABYLON.MeshBuilder.CreateBox('vagon-' + indice, { width: 0.9, height: 0.56, depth: 0.82 }, scene);
          base.position = new BABYLON.Vector3(x, 0, 0);
          base.material = material('vagon-mat-' + indice, completado ? '#64d28a' : seleccionado ? '#ffd85f' : '#4bb2e6');
          base.metadata = { tipo: 'vagon', indice: indice, paso: paso };

          var ruedaA = BABYLON.MeshBuilder.CreateCylinder('rueda-a-' + indice, { diameter: 0.18, height: 0.1, tessellation: 18 }, scene);
          ruedaA.rotation.z = Math.PI / 2;
          ruedaA.position = new BABYLON.Vector3(x - 0.25, -0.38, 0.43);
          ruedaA.material = material('rueda-mat-a-' + indice, '#263348');
          ruedaA.metadata = { tipo: 'vagon', indice: indice, paso: paso };

          var ruedaB = ruedaA.clone('rueda-b-' + indice);
          ruedaB.position.x = x + 0.2;
          ruedaB.metadata = { tipo: 'vagon', indice: indice, paso: paso };

          var esperado = crearFigura(paso.figuraId, 'objetivo-' + indice, new BABYLON.Vector3(x, 0.56, 0), 0.52, completado ? paso.colorHex : '#e9f2fb');
          esperado.visibility = completado ? 1 : 0.32;
          esperado.metadata = { tipo: 'vagon', decoracion: true, indice: indice, paso: paso };

          base.parent = grupoTren;
          ruedaA.parent = grupoTren;
          ruedaB.parent = grupoTren;
          esperado.parent = grupoTren;

          vagones.push(base, ruedaA, ruedaB, esperado);
        }

        function crearLocomotora() {
          var cuerpo = BABYLON.MeshBuilder.CreateBox('locomotora', { width: 1.18, height: 0.82, depth: 0.92 }, scene);
          cuerpo.position = new BABYLON.Vector3(-6.05, 0.08, 0);
          cuerpo.material = material('locomotora-mat', '#ff6b6b');
          var chimenea = BABYLON.MeshBuilder.CreateCylinder('chimenea', { diameter: 0.3, height: 0.5, tessellation: 18 }, scene);
          chimenea.position = new BABYLON.Vector3(-6.28, 0.76, 0);
          chimenea.material = material('chimenea-mat', '#273548');
          
          cuerpo.parent = grupoTren;
          chimenea.parent = grupoTren;

          vagones.push(cuerpo, chimenea);
        }

        function marcarSeleccion(paso) {
          estado.seleccion = paso;
          enviar({
            tipo: 'seleccionActualizada',
            clave: paso ? paso.clave : null
          });
          dibujarNivel();
        }

        function reportarNivelCompletado() {
          if (estado.nivelReportado) return;
          estado.nivelReportado = true;
          enviar({
            tipo: 'nivelCompletado',
            aciertos: estado.aciertos,
            errores: estado.errores,
            comboMaximo: estado.comboMaximo,
            tiempoNivelMs: Date.now() - estado.inicioNivelMs
          });
        }

        function resolverJugada(indiceVagon) {
          if (!estado.seleccion || indiceVagon == null || estado.completados[indiceVagon] || estadoTren === 'saliendo') return;
          var esperado = estado.patron[indiceVagon];
          if (!esperado) return;
          var acierto = estado.seleccion.clave === esperado.clave;
          var ahora = Date.now();
          var tiempoReaccionMs = ahora - estado.ultimaJugadaMs;
          estado.ultimaJugadaMs = ahora;

          if (acierto) {
            estado.aciertos += 1;
            estado.combo += 1;
            estado.comboMaximo = Math.max(estado.comboMaximo, estado.combo);
            estado.completados[indiceVagon] = true;
            estado.totalCompletados += 1;
          } else {
            estado.errores += 1;
            estado.combo = 0;
          }

          var nivelCompletado = acierto && estado.totalCompletados >= estado.patron.length;

          enviar({
            tipo: acierto ? 'acierto' : 'error',
            tiempoReaccionMs: tiempoReaccionMs,
            puntos: acierto ? 10 : 0,
            comboEnEvento: estado.combo,
            vagonIndex: indiceVagon,
            figuraSolicitada: esperado.figuraId,
            colorSolicitado: esperado.colorId,
            figuraIngresada: estado.seleccion.figuraId,
            colorIngresado: estado.seleccion.colorId,
            nivelCompletado: nivelCompletado
          });

          marcarSeleccion(null);
          dibujarNivel();

          if (nivelCompletado) {
            estadoTren = 'saliendo';
            reportarNivelCompletado();
          }
        }

        function dibujarNivel() {
          limpiarEscena();
          crearLocomotora();
          estado.patron.forEach(crearVagon);
          crearNube('nube-a', -3.8, 2.15, 1.8, 0.85);
          crearNube('nube-b', 2.9, 2.35, 1.9, 0.75);
        }

        window.iniciarNuevoNivel = function (params) {
          estado.patron = params.patron || [];
          estado.dificultad = params.dificultad || 1;
          estado.velocidadTren = params.velocidadTren || 1;
          estado.completados = {};
          estado.totalCompletados = 0;
          estado.aciertos = 0;
          estado.errores = 0;
          estado.combo = 0;
          estado.comboMaximo = 0;
          estado.inicioNivelMs = Date.now();
          estado.ultimaJugadaMs = Date.now();
          estado.nivelReportado = false;
          estado.seleccion = null;
          dibujarNivel();
          
          if (grupoTren) {
            grupoTren.position.x = inicioRecorridoX;
            estadoTren = 'entrando';
          }
        };

        function iniciar() {
          if (!window.BABYLON) {
            fallback.style.display = 'flex';
            enviar({ tipo: 'errorMotor', mensaje: 'Babylon.js no cargo desde CDN' });
            return;
          }

          engine = new BABYLON.Engine(canvas, true, { preserveDrawingBuffer: true, stencil: true, premultipliedAlpha: false });
          scene = new BABYLON.Scene(engine);
          scene.clearColor = new BABYLON.Color4(0.57, 0.86, 1, 0.18);

          var camera = new BABYLON.ArcRotateCamera('camara', Math.PI / 2, Math.PI / 2.36, 9.3, new BABYLON.Vector3(-0.55, 0.05, 0), scene);
          camera.attachControl(canvas, true);
          camera.lowerRadiusLimit = 7.2;
          camera.upperRadiusLimit = 11.2;
          camera.wheelPrecision = 36;
          camera.pinchPrecision = 52;
          if (camera.inputs.attached.pointers) {
            camera.inputs.attached.pointers.buttons = [0];
          }

          new BABYLON.HemisphericLight('luz', new BABYLON.Vector3(0.2, 1, 0.4), scene).intensity = 1.3;
          var sol = BABYLON.MeshBuilder.CreateSphere('sol', { diameter: 0.72, segments: 18 }, scene);
          sol.position = new BABYLON.Vector3(4.4, 2.8, 2.4);
          sol.material = material('sol-mat', '#ffd85f', true);
          var suelo = BABYLON.MeshBuilder.CreateGround('suelo', { width: 16.5, height: 7.4 }, scene);
          suelo.position.y = -0.72;
          suelo.material = material('suelo-mat', '#52b86a');
          var rielA = BABYLON.MeshBuilder.CreateBox('riel-a', { width: 11.5, height: 0.06, depth: 0.06 }, scene);
          rielA.position = new BABYLON.Vector3(-0.7, -0.44, 0.42);
          rielA.material = material('riel-a-mat', '#59677c');
          var rielB = rielA.clone('riel-b');
          rielB.position.z = -0.42;
          for (var i = 0; i < 18; i += 1) {
            var durmiente = BABYLON.MeshBuilder.CreateBox('durmiente-' + i, { width: 0.08, height: 0.08, depth: 1.1 }, scene);
            durmiente.position = new BABYLON.Vector3(-5.7 + i * 0.62, -0.5, 0);
            durmiente.material = material('durmiente-mat-' + i, '#8b6748');
          }

          grupoTren = new BABYLON.TransformNode('grupoTren', scene);
          grupoTren.scaling = new BABYLON.Vector3(1.12, 1.12, 1.12);

          // Tunnels (Left and Right)
          var tunelMat = material('tunel-mat', '#b87c4c');
          var fondoMat = material('fondo-mat', '#000000');

          var tunelIzq = BABYLON.MeshBuilder.CreateCylinder('tunel-izq', { diameter: 2.2, height: 2.2, tessellation: 16 }, scene);
          tunelIzq.rotation.z = Math.PI / 2;
          tunelIzq.position = new BABYLON.Vector3(-7.5, 0.3, 0);
          tunelIzq.material = tunelMat;

          var fondoIzq = BABYLON.MeshBuilder.CreatePlane('fondo-izq', { size: 2.2 }, scene);
          fondoIzq.rotation.y = Math.PI / 2;
          fondoIzq.position = new BABYLON.Vector3(-8.5, 0.3, 0);
          fondoIzq.material = fondoMat;

          var tunelDer = BABYLON.MeshBuilder.CreateCylinder('tunel-der', { diameter: 2.2, height: 2.2, tessellation: 16 }, scene);
          tunelDer.rotation.z = Math.PI / 2;
          tunelDer.position = new BABYLON.Vector3(7.5, 0.3, 0);
          tunelDer.material = tunelMat;

          var fondoDer = BABYLON.MeshBuilder.CreatePlane('fondo-der', { size: 2.2 }, scene);
          fondoDer.rotation.y = Math.PI / 2;
          fondoDer.position = new BABYLON.Vector3(8.5, 0.3, 0);
          fondoDer.material = fondoMat;

          scene.onPointerObservable.add(function (info) {
            if (estadoTren === 'saliendo') return;
            if (info.type !== BABYLON.PointerEventTypes.POINTERPICK) return;
            var picked = info.pickInfo && info.pickInfo.pickedMesh;
            if (!picked || !picked.metadata) return;
            if (picked.metadata.tipo === 'vagon') {
              resolverJugada(picked.metadata.indice);
            }
          });

          window.establecerSeleccion = function (entrada) {
            if (estadoTren === 'saliendo') return;
            var clave = typeof entrada === 'string' ? entrada : entrada && entrada.clave;
            var paso = estado.patron.find(function (item) { return item.clave === clave; });
            if (paso) marcarSeleccion(paso);
          };

          window.iniciarNuevoNivel(parametros);
          
          engine.runRenderLoop(function () {
            var t = performance.now() * 0.001 * estado.velocidadTren;
            
            if (grupoTren) {
              var avance = 0.028 * estado.velocidadTren;
              grupoTren.position.x += avance;

              if (estadoTren === 'entrando' && grupoTren.position.x >= -5.8) {
                estadoTren = 'jugando';
              }

              if (estadoTren === 'jugando' && grupoTren.position.x >= finRecorridoX) {
                grupoTren.position.x = inicioRecorridoX;
              }

              if (estadoTren === 'saliendo' && grupoTren.position.x >= finRecorridoX) {
                  grupoTren.position.x = finRecorridoX;
                  estadoTren = 'nivelCompletado';
                  reportarNivelCompletado();
              }
            }

            vagones.forEach(function (mesh) {
              if (mesh.metadata && mesh.metadata.decoracion) {
                mesh.rotation.y += 0.01;
              }
              if (mesh.name.indexOf('rueda') === 0) {
                mesh.rotation.x += 0.08 * estado.velocidadTren;
              }
              
              var globalX = mesh.absolutePosition.x;
              if (globalX > 7.0 || globalX < -7.0) {
                mesh.visibility = 0;
              } else {
                if (mesh.metadata && mesh.metadata.decoracion) {
                  mesh.visibility = estado.completados[mesh.metadata.indice] ? 1 : 0.32;
                } else {
                  mesh.visibility = 1;
                }
              }
            });
            scene.render();
          });
          window.addEventListener('resize', function () { engine.resize(); });
          enviar({ tipo: 'motorListo' });
        }

        setTimeout(iniciar, 50);
      })();
    </script>
  </body>
</html>`;
};
