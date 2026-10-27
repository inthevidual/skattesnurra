// (c) Jacob Lundberg 2013-2019

PBB = 46500 // prisbasbelopp 2019
skatt = 0
grundavdrag = 0
JSA = 0 // jobbskatteavdrag
arslon = 0
lonefterskatt = 0
skattutanjsa = 0
statsskatt = 0
AGA = 0.3142 // arbetsgivaravgift


google.load('visualization', '1', {'packages':["corechart"]})

// returnera datum

function datum(date) {
months = new Array("januari", "februari", "mars", "april", "maj", "juni", "juli", "augusti", "september", "oktober", "november", "december")

return '' + date.getDate() + ' ' + months[date.getMonth()]
}


// tusentalsgruppering

function tusental(nStr)
{
	nStr += '';
	x = nStr.split('.');
	x1 = x[0];
	x2 = x.length > 1 ? '.' + x[1] : '';
	var rgx = /(\d+)(\d{3})/;
	while (rgx.test(x1)) {
		x1 = x1.replace(rgx, '$1' + ' ' + '$2');
	}
	return x1 + x2;
}


// avrundning och formatering av tal som ska visas

function avrunda(num) {
num = Math.round(num)
if(num < 0) {
num = -num
negativ = true
} else {
negativ = false
}

num = tusental(num)

if(negativ)
return '&minus;' + num
else
return num
}


// funktion som körs när formuläret ändras eller skickas

function raknaut() {
arslon = document.form.lon.value * 12
kommunskatt = document.form.kommun.value / 100
// procentmat = document.form.procentmat.value / 100
// procentbocker = document.form.procentbocker.value / 100
// procentannat = document.form.procentannat.value / 100
// ungdom = document.form.ungdom.checked

marginalskatt = 0

// dagens skattesystem

// grundavdrag

if(arslon > 0 && arslon < 0.99*PBB) {
grundavdrag = Math.ceil(0.423*PBB/100)*100
}

else if(arslon >= 0.99*PBB && arslon < 2.72*PBB) {
grundavdrag = Math.ceil((0.225*PBB+0.2*arslon)/100)*100
}

else if(arslon >= 2.72*PBB && arslon < 3.11*PBB) {
grundavdrag = Math.ceil(0.770*PBB/100)*100
}

else if(arslon >= 3.11*PBB && arslon < 7.88*PBB) {
grundavdrag = Math.ceil((1.081*PBB-0.1*arslon)/100)*100
}

else if(arslon >= 7.88*PBB) {
grundavdrag = Math.ceil(0.293*PBB/100)*100
}

else {
resultat.innerHTML = 'Skriv bara siffror utan mellanslag eller kommatecken.<p>'
return
}


// jobbskatteavdrag

if(arslon > 0 && arslon < 0.91*PBB) {
marginalskatt = 0
JSA = (arslon - grundavdrag) * kommunskatt
if(JSA < 0)
JSA = 0
}

else if(arslon >= 0.91*PBB && arslon < 3.24*PBB) {
marginalskatt = kommunskatt * (1 - 0.3405)
JSA = (0.91*PBB + 0.3405*(arslon - 0.91*PBB) - grundavdrag)*kommunskatt
}

else if(arslon >= 3.24*PBB && arslon < 8.08*PBB) {
marginalskatt = kommunskatt * (1 - 0.128)
JSA = (1.703*PBB + 0.128*(arslon - 3.24*PBB) - grundavdrag)*kommunskatt
}

else if(arslon >= 8.08*PBB && arslon < 13.54*PBB) {
marginalskatt = kommunskatt
JSA = (2.323*PBB - grundavdrag)*kommunskatt
}

else if(arslon >= 13.54*PBB) {
marginalskatt = kommunskatt + 0.03
JSA = Math.max(0, (2.323*PBB - grundavdrag)*kommunskatt - 0.03 * (arslon - 13.54*PBB))
}

skattutanjsa = Math.round((arslon - grundavdrag) * kommunskatt)

if(skattutanjsa < 0)
skattutanjsa = 0


// statlig inkomstskatt 2019

statsskatt = 0
brytpunkt1 = 13700 + 490700
brytpunkt2 = 13700 + 689300

if(arslon > brytpunkt1) {
statsskatt = (arslon - brytpunkt1) * 0.2
marginalskatt += 0.2
}

if(arslon > brytpunkt2) {
statsskatt += (arslon - brytpunkt2) * 0.05
marginalskatt += 0.05
}


skatt = Math.round(skattutanjsa - JSA + statsskatt)

// begravningsavgift 2019 (ej Stockholm och Tranås)
begravning = 0.00253

// 0.0024 i Tranås

// begravningsavgift i Stockholm
if(kommunskatt == 0.2982) {
begravning = 0.00065
}

begravningsavgift = Math.max(0, (arslon - grundavdrag) * begravning)


// allmän pensionsavgift

apa = 0

if(arslon >= Math.ceil(0.423*PBB/100)*100) {
apa = Math.round((0.07 * Math.floor(arslon/100)*100)/100)*100

if(apa < skatt)
apa = 0
else
apa = apa - skatt

}


// public service-avgift

publicservice = 0.01 * Math.min(2.092 * 64400, Math.max(0, arslon - grundavdrag))


// räkna samman

lonefterskatt = Math.round(arslon - skatt - apa - begravningsavgift - publicservice)

// if(ungdom)
// arbetsgivaravgift = AGAU
// else
arbetsgivaravgift = AGA


arbetsgivaravgiftperar = arslon * arbetsgivaravgift

totalarslon = arslon + arbetsgivaravgiftperar

// viktadmoms = 0.25 / 1.25 * procentannat + 0.12 / 1.12 * procentmat + 0.06 / 1.06 * procentbocker
// viktadmoms = 0.2097
viktadmoms = 0.19

moms = viktadmoms * lonefterskatt

totalmarginalskatt = (marginalskatt + (1 - marginalskatt) * viktadmoms + arbetsgivaravgift) / (1 + arbetsgivaravgift)

totalskatt = moms + arbetsgivaravgiftperar + skatt + apa + begravningsavgift + publicservice

totalsnittskatt = totalskatt / totalarslon


tusenlapparskatt = Math.round(totalskatt / 12 / 1000)
tusenlapparkvar = Math.round((lonefterskatt - moms) / 12 / 1000)

skattefridag = new Date(365 * 24 * 60 * 60 * 1000 * totalsnittskatt) // millisekunder in på 1970 (1970 ej skottår)


/*
var data = google.visualization.arrayToDataTable([
          ['Skatt', 'Kronor per månad'],
          ['Arbetsgivaravgift',     Math.round(arbetsgivaravgiftperar / 12)],
          ['Allmän pensionsavgift',     Math.round(apa / 12)],
          ['Kommunalskatt',  Math.round((skattutanjsa - JSA + begravningsavgift) / 12)],
          ['Statlig skatt', Math.round(statsskatt / 12)],
          ['Moms och punktskatter',    Math.round(moms / 12)],
          ['Kvar till dig',    Math.round((lonefterskatt - moms) / 12)]
        ]);


        var options = {
          title: 'Vad händer med dina pengar?',
          pieSliceText: 'value',
	  legend: 'bottom',
	  width: 700
        };

        var chart = new google.visualization.PieChart(document.getElementById('piechart'));

        chart.draw(data, options);

*/
// output


banknotetext = '<img src=tusenlapp.jpg width=100 class=tusenlapp> '

skatteuppdelning = '<p>Inklusive arbetsgivaravgifter tjänar du ' + avrunda(totalarslon / 12) + ' kr per månad. Av detta går ' + avrunda(totalskatt / 12) + ' kr (' + Math.round(totalsnittskatt * 100) + '&nbsp;%) i skatt.</p>'

// '<strong>Vem får pengarna?</strong></p><div class="table"><table class="table table-responsive"><tr><td>DU<br><span class="sizeup">' + avrunda((lonefterskatt - moms) / 12) + ' kr</span> (' + Math.round((1 - totalsnittskatt) * 100) + '&nbsp;%)</td><td>STATEN<br><span class="sizeup">' + avrunda(totalskatt / 12) + ' kr</span> (' + Math.round(totalsnittskatt * 100) + '&nbsp;%)</td></tr></div>'

output = ''

// tabell som specificerar inkomst och skatter
output += '<br/><h2>Dina skatter</h2><div class="skattewrap inner-content"><div class="table"><table class="table table-striped table-skatter"><tr><td><b>Arbetsgivarens kostnad</b></td><td align=right><b>' + avrunda(totalarslon / 12) + '</b></td></tr><tr><td>Arbetsgivaravgifter</td><td align=right>' + avrunda(-arbetsgivaravgiftperar / 12) + '</td></tr>'
output += '<tr><td><b>Din månadslön</b></td><td align=right><b>' + avrunda(arslon / 12) + '</b></td></tr><tr><td>Kommunalskatt</td><td align=right>' + avrunda(-skattutanjsa / 12) + '</td></tr><tr><td>Jobbskatteavdrag</td><td align=right>' + avrunda(JSA / 12) + '</td></tr>'

// statlig inkomstskatt
if(statsskatt > 0)
output += '<tr><td>Statlig inkomstskatt</td><td align=right>' + avrunda(-statsskatt / 12) + '</td></tr>'

// allmän pensionsavgift
if(apa > 0)
output += '<tr><td>Allmän pensionsavgift</td><td align=right>' + avrunda(-apa / 12) + '</td></tr>'

// begravningsavgift
if(begravningsavgift > 0)
output += '<tr><td>Begravningsavgift</td><td align=right>' + avrunda(-begravningsavgift / 12) + '</td></tr>'

// public service-avgift
if(publicservice > 0)
output += '<tr><td>Public service-avgift</td><td align=right>' + avrunda(-publicservice / 12) + '</td></tr>'

output += '<tr><td><b>Lön efter skatt</b></td><td align=right><b>' + avrunda(lonefterskatt / 12) + '</b></td></tr>'

output += '<tr><td>Moms och punktskatter*</td><td align=right>' + avrunda(-moms / 12) + '</td></tr>'

output += '<tr><td><b>Kvar efter alla skatter</b></td><td align=right><b>' + avrunda((lonefterskatt - moms) / 12) + '</b></td></tr>'

output += '<tr><td><font color=red><b>Summa skatter</b></font></td><td align=right><font color=red><b>' + avrunda(-totalskatt / 12) + '</b></font></td></tr></table><p></div>* Beräknat på snittet i befolkningen.'

// output += 'Du betalar ' + avrunda(moms / 12) + ' kr i moms varje månad.<p>'

// output += 'Din arbetsgivare betalar dessutom ' + avrunda(arbetsgivaravgiftperar / 12) + ' kr per månad i skatt i form av arbetsgivaravgift. Det du tjänar ihop totalt är därför ' + avrunda(totalarslon / 12) + ' kr.<p>'

// output += 'Totala skatter som andel av arbetsgivarens kostnad är ' + avrunda(totalsnittskatt * 100) + ' procent. </div>'

// output += 'Du får alltså behålla ' + avrunda((1 - totalsnittskatt) * 100) + ' procent av det du tjänat ihop.<p>'

// output += 'Din skattefridag infaller den ' + datum(skattefridag) + '. Då har ' + avrunda(totalsnittskatt * 100) + ' procent av året gått och du har betalat klart årets skatter och börjar tjäna in pengar till dig själv.<p>'

resultat.innerHTML = output
}
Chart.defaults.global.plugins.datalabels.display = function(ctx) {
  return ctx.dataset.data[ctx.dataIndex] !== 0;
}
Chart.defaults.global.defaultFontFamily = "DINOT";
Chart.defaults.global.plugins.datalabels.font.size = 10;
  Chart.defaults.global.plugins.datalabels.font.weight = 700;
  Chart.defaults.global.plugins.datalabels.textShadowColor = '#000';
  Chart.defaults.global.legend.labels.usePointStyle = true;
  Chart.defaults.global.tooltips.mode = "average";
  Chart.defaults.global.tooltips.caretPadding = 20;



function chart_function() {
  var raknaskatt = document.getElementById('myChart').getContext('2d');
skattekarta = new Chart(raknaskatt, {
    type: 'pie',
    data: {
        datasets: [{
          backgroundColor: ["#AA3344", "#CC5566","#FF8899", "#EEBB11"],
//          backgroundColor: ["#9a031e", "#5f0f40","#e36414", "#eebb11"],
          fontFamily: "DINOT",

            data: [Math.round((arbetsgivaravgiftperar) /12), Math.round((skatt + apa + begravningsavgift + publicservice) /12), Math.round((moms) /12), Math.round(((lonefterskatt - moms))/12) ]
        }],


        // These labels appear in the legend and in the tooltips when hovering different arcs
        labels: [
            'Arbetsgivaravgifter',
            'Inkomstskatt',
            'Moms och punktskatter',
						'Kvar efter skatt'
        ],

    },
    scales: {

        ticks: {
            stepSize: 1,
            min: 0,
            autoSkip: false
        }},
    options: {
      plugins: {
          // Change options for ALL labels of THIS CHART
          labels: {
       display: false
     },
     datalabels: {
       color: '#fff',
       textShadowColor: '#000',
       textShadowBlur: 2,
			 formatter: function formatter(value, ctx) {

								var sum = 0;
								var dataArr = ctx.chart.data.datasets[0].data;
								dataArr.map(function (data) {
										sum += data;
								});
								var percentage = (value * 100 / sum).toFixed(0) + "%";
								var newvalue = '\n' + value;
								return percentage + newvalue + ' kr';
						}
				} },


      maintainAspectRatio: false,
      responsive: true,

      animation: false,
      showAllTooltips: true,
      tooltips: {
           yAlign: 'center',
           xAlign: 'center',
           bodySpacing: 10,
           bodyFontSize: 10,


       },


   legend: {
   labels: {
                  filter: function (legendItem, chartData) {
                      return chartData.datasets[0].data[legendItem.index] > 0;
                  },
                  padding: 20 ,
                  boxWidth: 20,
              },
              display: true,
            },


}});




$('.dynamictaxtable').html(skatteuppdelning);

}


function raknaskatt_update() {
	raknaut();
  skattekarta.destroy();
  chart_function();

// marginalskattresultat.innerHTML = '<h3>Marginalskatt</h3>Din marginalskatt – skatt på sist intjänade hundralappen – är ' + avrunda(marginalskatt * 100) + ' procent om man bara räknar inkomstskatten. Lägger man till arbetsgivaravgift, moms och punktskatter får man din effektiva marginalskatt, som är ' + avrunda(totalmarginalskatt * 100) + ' procent.'
}
