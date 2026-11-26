// Google Funding Choices presence signal (the standard Privacy & messaging tag snippet, moved to a
// file because the studio page allows no inline scripts). Lets the Offerwall message load.
(function () {
  function signalGooglefcPresent() {
    if (!window.frames["googlefcPresent"]) {
      if (document.body) {
        var iframe = document.createElement("iframe");
        iframe.style = "width: 0; height: 0; border: none; z-index: -1000; left: -1000px; top: -1000px;";
        iframe.style.display = "none";
        iframe.name = "googlefcPresent";
        document.body.appendChild(iframe);
      } else {
        setTimeout(signalGooglefcPresent, 0);
      }
    }
  }
  signalGooglefcPresent();
})();
