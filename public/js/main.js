// Keep global scope clean with an immediate function
(function($) {

  // namespace for better semantics
  var SendMoney = {
    currencyPrefix: "$",

    init: function() {
      this.emailWrapper     = $('.form-item.to');
      this.emailLoader      = this.emailWrapper.find('.loader');
      this.emailInput       = $('#to')
      this.amountInput      = $('#amount');
      this.currencySelector = $('#currency');
      this.message          = $('#message');
      this.paymentItems     = $('.payment-item');

      this.overlay          = $('#overlay');

      SendMoney.bindEvents();
    },

    // Semaphore variable to avoid multiple server requests
    isEmailBeingValidated: false,

    bindEvents: function() {
      SendMoney.bindValidations();

      SendMoney.bindPaymentForSelection();
      SendMoney.bindFriendlySelection();

      SendMoney.bindAmountBehavior();
      SendMoney.bindCurrencySelection();

      // Buttons
      SendMoney.bindClearButton();
      SendMoney.bindNextButton();
    },

    bindValidations: function() {
      SendMoney.bindEmailValidation();
    },

    bindEmailValidation: function() {
      var lastValue = SendMoney.emailInput.val(),

          // UX - trigger validation after some determined time
          triggerValidationTimeout;

      SendMoney.emailInput.on('keyup', function(e) {
        if (lastValue !== SendMoney.emailInput.val()) {
          lastValue = SendMoney.emailInput.val();

          clearTimeout(triggerValidationTimeout);

          triggerValidationTimeout = setTimeout(function() {
            SendMoney.validateEmail(lastValue);
          }, 1000);
        }
      });
    },

    bindAmountBehavior: function() {
      var lastValue,
          amountInputWrapper = SendMoney.amountInput.parent('.form-item');

      SendMoney.amountInput.on('input', function(e) {
        var newValue = e.target.value,
            newFormattedValue = SendMoney.formatMoney(newValue);

        amountInputWrapper.removeClass('invalid');

        if (lastValue !== newValue) {
          SendMoney.amountInput.val(newFormattedValue);
          lastValue = newFormattedValue;
          e.preventDefault();
        }
      });
    },

    bindCurrencySelection: function() {
      SendMoney.currencySelector.on('change', function() {
        SendMoney.currencyPrefix = $(this).find('option:selected').attr('rel');

        // update value
        var newValue = SendMoney.formatMoney(SendMoney.amountInput.val());
        SendMoney.amountInput.val(newValue);
      });
    },

    formatMoney: function(value) {
      // remove previous formatting
      value = value.toString().replace(/[^0-9]/g, '');
      // empty string defaults to 0
      value = value || "0";

      var digits = value.split(''),
          number = digits.slice(0, -2).join(''),
          precision = digits.slice(-2).join('');

      // fix minimum number size
      number = number.length ? number.replace(/^0*([0-9]+)$/, "$1") : '0';
      precision = precision.length === 1 ? '0' + precision : precision;

      // add commas for thousands
      // kind of black magic
      number = number.split('').reverse().join('') // reverse string
               .replace(/(\d{3})(?=\d)/g, "$1,")   // add the commas
               .split('').reverse().join('');      // reverse it back

      return SendMoney.currencyPrefix + number + '.' + precision;
    },

    validateEmail: function(email) {
      if (!SendMoney.isEmailBeingValidated) {
        SendMoney.showEmailLoading();
        SendMoney.isEmailBeingValidated = true;

        $.post('/validate-email', { email: email }, function(response) {
          SendMoney.hideEmailLoading();

          if (response.valid) {
            SendMoney.validEmailDisplay();
          }
          else {
            SendMoney.invalidEmailDisplay();
          }

          SendMoney.isEmailBeingValidated = false;
        });
      }
    },

    showEmailLoading: function() {
      SendMoney.emailWrapper.removeClass('invalid').removeClass('valid');
      SendMoney.emailLoader.show();
    },

    hideEmailLoading: function() {
      SendMoney.emailLoader.hide();
    },

    validEmailDisplay: function() {
      SendMoney.emailWrapper.removeClass('invalid').addClass('valid');
    },

    invalidEmailDisplay: function() {
      SendMoney.emailWrapper.removeClass('valid').addClass('invalid');
    },

    bindFriendlySelection: function() {
      // Select first input field when the click occurs on .form-item
      // just makes it more usable..
      $('.form-item').on('click', function(e) {
        $(this).find('input:first, textarea:first').focus();
      });
    },

    bindPaymentForSelection: function() {
      $('.payment-for').on('click', '.payment-item', function(e) {
        SendMoney.deactivateAllPaymentItems();
        $(this).addClass('active');
        $(this).parents('.form-item').removeClass('invalid');
      });
    },

    deactivateAllPaymentItems: function() {
      SendMoney.paymentItems.removeClass('active');
    },

    bindClearButton: function() {
      // hidden form input element
      var resetButton = $('#reset');

      $('.clear-btn').on('click', function(e) {
        resetButton.click();
        SendMoney.deactivateAllPaymentItems();

        // do not append # to URL - more friendly
        e.preventDefault();
      })
    },

    bindNextButton: function() {
      $('.next-btn').on('click', function(e) {
        SendMoney.postTransaction();

        // do not append # to URL - more friendly
        e.preventDefault();
      });
    },

    postTransaction: function() {
      SendMoney.overlay.show();

      $.post('/transactions', SendMoney.getFormData(), function(response) {
        if (response.valid) {
          $('.content').html(response.message);
          SendMoney.updateFooterOnSuccess();
        }
        else {
          SendMoney.handleErrors(response.errors);
        }

        SendMoney.overlay.hide();
      });
    },

    updateFooterOnSuccess: function() {
      $('footer .default').hide();
      $('footer .on-success').show();
    },

    handleErrors: function(errors) {
      for (error in errors) {
        $('#' + error).parent('.form-item').addClass('invalid');
      }
    },

    getFormData: function() {
      return {
        'to':          SendMoney.emailInput.val(),
        'amount':      SendMoney.amountInput.val().replace(), // remove non-numbers
        'currency':    SendMoney.currencySelector.val(),
        'message':     SendMoney.message.val(),
        'payment-for': SendMoney.paymentItems.filter('.active').find('input').val()
      }
    }
  };

  // initialize SendMoney form behavior when document is ready
  $(function() {
    SendMoney.init();
  });
})(jQuery);
