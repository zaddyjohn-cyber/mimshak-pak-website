/* =================================================================
   Mimshak Pak — outside services
   -----------------------------------------------------------------
   Each service stays switched off until its keys are filled in, and
   the website simply hides that feature until then. Nothing here is
   secret: these are all public keys meant to sit in a web page. The
   private keys must NEVER be put in this file.

   Fill these in from the admin panel under Finance > Integrations.
   ================================================================= */
window.MPI_INTEGRATIONS = {

  /* ---------- Paystack: taking card and transfer payments ----------
     Get this from your Paystack dashboard under Settings > API Keys.
     Use the key beginning pk_live_ once your account is approved.
     NEVER put the sk_live_ secret key here. */
  paystack: {
    publicKey: "",
    currency: "NGN"
  },

  /* ---------- Cloudinary: customers uploading artwork ----------
     Create a free account, then under Settings > Upload create an
     "unsigned" upload preset and put its name here. Unsigned is what
     lets a customer upload without you handing out a password. */
  cloudinary: {
    cloudName: "",
    uploadPreset: "",
    maxFileMb: 15
  },

  /* ---------- EmailJS: sending order updates by email ----------
     Free account at emailjs.com. You need the public key, the service
     you connect your email through, and the template id. */
  emailjs: {
    publicKey: "",
    serviceId: "",
    templateId: ""
  }
};

/* Helper the rest of the site uses to check whether a service is ready. */
window.MPI_READY = function (name) {
  var c = (window.MPI_INTEGRATIONS || {})[name] || {};
  if (name === "paystack")   return !!c.publicKey;
  if (name === "cloudinary") return !!(c.cloudName && c.uploadPreset);
  if (name === "emailjs")    return !!(c.publicKey && c.serviceId && c.templateId);
  return false;
};
