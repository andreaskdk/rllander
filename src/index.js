

const settings = ({ r_ship: 15, time_delta: 0.1, pad_width: 100, angular_force: 0.5, gravity: -0.8})

export function physics(state, action, time_delta) {
    let new_state={fire_left: action.left, fire_right: action.right}
    new_state.time=state.time+time_delta;
    new_state.vphi=state.vphi+time_delta*(action.left*settings.angular_force-action.right*settings.angular_force);
    new_state.vx=state.vx+time_delta*((action.right+action.left)*Math.sin(state.phi));
    new_state.vy=state.vy+time_delta*((action.right+action.left)*Math.cos(state.phi)+settings.gravity);
    new_state.phi=state.phi+time_delta*new_state.vphi;
    new_state.x=state.x+time_delta*new_state.vx;
    new_state.y=state.y+time_delta*new_state.vy;
    new_state.left_wall=state.left_wall;
    new_state.right_wall=state.right_wall;
    return new_state;
}

function* simulate_landing(state, strategy) {
    let action={right: 0, left: 0};
    yield state, action;

    while(true) {
        let action=strategy(state);
        state=physics(state, action, settings.time_delta);
        yield state, action;
    }
}

export function is_crashed(state) {
    if(state.y<0) {
        return true;
    }
    let i=1;
    while(state.left_wall[i][1]>state.y) {
        i++;
    }

    let left_wall_x=(state.y-state.left_wall[i][1])/(state.left_wall[i-1][1]-state.left_wall[i][1])*(state.left_wall[i-1][0]-state.left_wall[i][0])+state.left_wall[i][0];
    if(state.x<left_wall_x+settings.r_ship/2) {
        return true;
    }
    i=1;
    while(state.right_wall[i][1]>state.y) {
        i++;
    }
    let right_wall_x=(state.y-state.right_wall[i][1])/(state.right_wall[i-1][1]-state.right_wall[i][1])*(state.right_wall[i-1][0]-state.right_wall[i][0])+state.right_wall[i][0];
    if(state.x>right_wall_x-settings.r_ship/2) {
        return true;
    }
    return false;
}

export function is_landed(state){
    if(state.y<4 && Math.abs(state.vy)<5 && Math.abs(state.vx)<5 && Math.abs(state.x<40) &&
        Math.abs(state.phi)<0.1 && Math.abs(state.vphi)<0.4) {
        return true;
    }
    return false;
}

export async function* animate_simulation(svg, state, strategy) {

    let height=svg.getBoundingClientRect().height;
    let width=svg.getBoundingClientRect().width;

    var y_scale=d3.scaleLinear()
        .domain([-10,110])
        .range([height, 0]);

    var x_scale=d3.scaleLinear()
        .domain([-10, 110])
        .range([width/2-10, width/2+110]);

    var walls=d3.select(svg)
        .append("g")
        .attr("class", "wall");

    for(let wall of [state.left_wall, state.right_wall]) {
        for(let i=1; i<wall.length; i++) {
            walls.append("line")
                .attr("x1", x_scale(wall[i-1][0]))
                .attr("y1", y_scale(wall[i-1][1]))
                .attr("x2", x_scale(wall[i][0]))
                .attr("y2", y_scale(wall[i][1]))
                .attr("stroke", "gray")
                .attr("stroke-width", 5);
        }
    }



    const vehicle_scale=settings.r_ship/60;
    var vehicle=d3.select(svg)
        .append("g")
        .attr("class", "vehicle");

    for(var side in [0, 1]) {
        for(var l in [0, 1, 2]) {
            vehicle.append("line")
                .attr("class", "engine_fire_"+side+"_"+l)
                .attr("transform", "rotate("+state.phi*180/Math.PI+" "+x_scale(state.x)+" "+y_scale(state.y)+")")
                .attr("x1", x_scale(state.x)+((side==0?-1:1)*(9+l*7))*vehicle_scale)
                .attr("x2", x_scale(state.x)+((side==0?-1:1)*(9+l*7))*vehicle_scale)
                .attr("y1", y_scale(state.y)+47*vehicle_scale)
                .attr("y2", y_scale(state.y)+(61+(l==1?10:0))*vehicle_scale)
                .attr("stroke-width", 4*vehicle_scale)
                .attr("stroke", "darkorange");
        }
    }

    vehicle.append("rect")
        .attr("transform", "rotate("+state.phi*180/Math.PI+" "+x_scale(state.x)+" "+y_scale(state.y)+")")
        .attr("x", x_scale(state.x)-25*vehicle_scale)
        .attr("y", y_scale(state.y)-35*vehicle_scale)
        .attr("height", 60*vehicle_scale)
        .attr("width", 50*vehicle_scale)
        .style("fill", "steelblue")
        .style("stroke", "steelblue");

    vehicle.append("path")
        .attr("class", "head_left")
        .attr("transform", "rotate("+state.phi*180/Math.PI+" "+x_scale(state.x)+" "+y_scale(state.y)+")")
        .attr("d", "M "+(x_scale(state.x)-25*vehicle_scale)+ " " + (y_scale(state.y)-35*vehicle_scale)+
            " C "+(x_scale(state.x)-25*vehicle_scale)+ " " + (y_scale(state.y)-50*vehicle_scale)+
            ", "+(x_scale(state.x)-25*vehicle_scale)+ " " + (y_scale(state.y)-50*vehicle_scale)+
            ", "+(x_scale(state.x))+ " " + (y_scale(state.y)-75*vehicle_scale))
        .style("fill", "steelblue")
        .style("stroke", "steelblue");

    vehicle.append("path")
        .attr("class", "head_right")
        .attr("transform", "rotate("+state.phi*180/Math.PI+" "+x_scale(state.x)+" "+y_scale(state.y)+")")
        .attr("d", "M "+(x_scale(state.x)+25*vehicle_scale)+ " " + (y_scale(state.y)-35*vehicle_scale)+
            " C "+(x_scale(state.x)+25*vehicle_scale)+ " " + (y_scale(state.y)-50*vehicle_scale)+
            ", "+(x_scale(state.x)+25*vehicle_scale)+ " " + (y_scale(state.y)-50*vehicle_scale)+
            ", "+(x_scale(state.x))+ " " + (y_scale(state.y)-75*vehicle_scale))
        .style("fill", "steelblue")
        .style("stroke", "steelblue");

    vehicle.append("polygon")
        .attr("class", "tri_fill")
        .attr("transform", "rotate("+state.phi*180/Math.PI+" "+x_scale(state.x)+" "+y_scale(state.y)+")")
        .attr("points", (x_scale(state.x)-25*vehicle_scale)+", "+(y_scale(state.y)-35*vehicle_scale)+
            " "+(x_scale(state.x)+25*vehicle_scale)+", "+(y_scale(state.y)-35*vehicle_scale)+
            " "+(x_scale(state.x))+", "+(y_scale(state.y)-75*vehicle_scale))
        .style("fill", "steelblue")
        .style("stroke", "steelblue");

    vehicle.append("polygon")
        .attr("class", "left_engine")
        .attr("transform", "rotate("+state.phi*180/Math.PI+" "+x_scale(state.x)+" "+y_scale(state.y)+")")
        .attr("points", (x_scale(state.x)-21*vehicle_scale)+", "+(y_scale(state.y)+25*vehicle_scale)+
            " "+(x_scale(state.x)-27*vehicle_scale)+", "+(y_scale(state.y)+45*vehicle_scale)+
            " "+(x_scale(state.x)-5*vehicle_scale)+", "+(y_scale(state.y)+45*vehicle_scale)+
            " "+(x_scale(state.x)-11*vehicle_scale)+", "+(y_scale(state.y)+25*vehicle_scale))
        .style("fill", "#1f3b51")
        .style("stroke", "steelblue");

    vehicle.append("polygon")
        .attr("class", "right_engine")
        .attr("transform", "rotate("+state.phi*180/Math.PI+" "+x_scale(state.x)+" "+y_scale(state.y)+")")
        .attr("points", (x_scale(state.x)+21*vehicle_scale)+", "+(y_scale(state.y)+25*vehicle_scale)+
            " "+(x_scale(state.x)+27*vehicle_scale)+", "+(y_scale(state.y)+45*vehicle_scale)+
            " "+(x_scale(state.x)+5*vehicle_scale)+", "+(y_scale(state.y)+45*vehicle_scale)+
            " "+(x_scale(state.x)+11*vehicle_scale)+", "+(y_scale(state.y)+25*vehicle_scale))
        .style("fill", "#1f3b51")
        .style("stroke", "steelblue");

    const pad=d3.select(svg).append("g")
        .attr("class", "pad");

    pad.append("rect")
        .attr("fill", "orange")
        .attr("x", x_scale(0)-settings.pad_width/2)
        .attr("y", y_scale(0))
        .attr("width", settings.pad_width)
        .attr("height", 5);

    const tick_ms=60;
    var simulation=simulate_landing(state, strategy);
    var start_time=Date.now();
    let done=false;
    while(!done) {

        vehicle.select("rect")
            .attr("transform", "rotate("+state.phi*180/Math.PI+" "+x_scale(state.x)+" "+y_scale(state.y)+")")
            .attr("x", x_scale(state.x)-25*vehicle_scale)
            .attr("y", y_scale(state.y)-35*vehicle_scale);

        vehicle.select(".head_left")
            .attr("transform", "rotate("+state.phi*180/Math.PI+" "+x_scale(state.x)+" "+y_scale(state.y)+")")
            .attr("d", "M "+(x_scale(state.x)-25*vehicle_scale)+ " " + (y_scale(state.y)-35*vehicle_scale)+
                " C "+(x_scale(state.x)-25*vehicle_scale)+ " " + (y_scale(state.y)-50*vehicle_scale)+
                ", "+(x_scale(state.x)-25*vehicle_scale)+ " " + (y_scale(state.y)-50*vehicle_scale)+
                ", "+(x_scale(state.x))+ " " + (y_scale(state.y)-75*vehicle_scale));

        vehicle.select(".head_right")
            .attr("transform", "rotate("+state.phi*180/Math.PI+" "+x_scale(state.x)+" "+y_scale(state.y)+")")
            .attr("d", "M "+(x_scale(state.x)+25*vehicle_scale)+ " " + (y_scale(state.y)-35*vehicle_scale)+
                " C "+(x_scale(state.x)+25*vehicle_scale)+ " " + (y_scale(state.y)-50*vehicle_scale)+
                ", "+(x_scale(state.x)+25*vehicle_scale)+ " " + (y_scale(state.y)-50*vehicle_scale)+
                ", "+(x_scale(state.x))+ " " + (y_scale(state.y)-75*vehicle_scale))
        vehicle.select(".tri_fill")
            .attr("transform", "rotate("+state.phi*180/Math.PI+" "+x_scale(state.x)+" "+y_scale(state.y)+")")
            .attr("points", (x_scale(state.x)-25*vehicle_scale)+", "+(y_scale(state.y)-35*vehicle_scale)+
                " "+(x_scale(state.x)+25*vehicle_scale)+", "+(y_scale(state.y)-35*vehicle_scale)+
                " "+(x_scale(state.x))+", "+(y_scale(state.y)-75*vehicle_scale));

        vehicle.select(".left_engine")
            .attr("transform", "rotate("+state.phi*180/Math.PI+" "+x_scale(state.x)+" "+y_scale(state.y)+")")
            .attr("points", (x_scale(state.x)-21*vehicle_scale)+", "+(y_scale(state.y)+25*vehicle_scale)+
                " "+(x_scale(state.x)-27*vehicle_scale)+", "+(y_scale(state.y)+45*vehicle_scale)+
                " "+(x_scale(state.x)-5*vehicle_scale)+", "+(y_scale(state.y)+45*vehicle_scale)+
                " "+(x_scale(state.x)-11*vehicle_scale)+", "+(y_scale(state.y)+25*vehicle_scale));

        vehicle.select(".right_engine")
            .attr("transform", "rotate("+state.phi*180/Math.PI+" "+x_scale(state.x)+" "+y_scale(state.y)+")")
            .attr("points", (x_scale(state.x)+21*vehicle_scale)+", "+(y_scale(state.y)+25*vehicle_scale)+
                " "+(x_scale(state.x)+27*vehicle_scale)+", "+(y_scale(state.y)+45*vehicle_scale)+
                " "+(x_scale(state.x)+5*vehicle_scale)+", "+(y_scale(state.y)+45*vehicle_scale)+
                " "+(x_scale(state.x)+11*vehicle_scale)+", "+(y_scale(state.y)+25*vehicle_scale));

        for(var side in [0, 1]) {
            var visible = side==0 ? state.fire_left : state.fire_right;
            for(var l in [0, 1, 2]) {
                vehicle.select(".engine_fire_"+side+"_"+l)
                    .attr("visibility", visible ? "visible":"hidden")
                    .attr("transform", "rotate("+state.phi*180/Math.PI+" "+x_scale(state.x)+" "+y_scale(state.y)+")")
                    .attr("x1", x_scale(state.x)+((side==0?-1:1)*(9+l*7))*vehicle_scale)
                    .attr("x2", x_scale(state.x)+((side==0?-1:1)*(9+l*7))*vehicle_scale)
                    .attr("y1", y_scale(state.y)+47*vehicle_scale)
                    .attr("y2", y_scale(state.y)+(61+(l==1?10:0))*vehicle_scale);
            }
        }

        yield svg;
        await new Promise(r => setTimeout(r, Math.max(0,tick_ms-Date.now()+start_time)));
        start_time=Date.now();
        state=simulation.next().value;

        if(is_landed(state)) {
            d3.select(svg).append("text")
                .attr("x", x_scale(state.x))
                .attr("y", y_scale(state.y))
                .attr("stroke", "black")
                .attr("text-anchor", "middle")
                .text("Landed");
            done=true;
        }

        if(is_crashed(state)) {
            d3.select(svg).append("text")
                .attr("x", x_scale(state.x))
                .attr("y", y_scale(state.y))
                .attr("stroke", "black")
                .attr("text-anchor", "middle")
                .text("Crashed");
            done=true;
        }
    }
    yield svg;
}


function start_navigate() {
    function do_left(state) {
        return {right: nav_right, left: nav_left}
    }

    const start_state = {
        x: 0, y: 100, phi: 0.4, vx: 0, vy: 0,
        vphi: 0,
        time: 0,
        fire_right: 0,
        fire_left: 0,
        left_wall: [[-80, 100], [0, 50], [-50, 0]],
        right_wall: [[80, 100], [100, 50], [50, 0]]
    };

    let nav_left=0;
    let nav_right=0;
    d3.select("#surrounding_div").on("keydown", e=>{
        if(e.key=="ArrowLeft") {
            nav_left=1;
        }
        if(e.key=="ArrowRight") {
            nav_right=1;
        }
    });

    d3.select("#surrounding_div").on("keyup", e=>{
        if(e.key=="ArrowLeft") {
            nav_left=0;
        }
        if(e.key=="ArrowRight") {
            nav_right=0;
        }
    });
    d3.select("#land").selectAll("*").remove();
    let s = rllander.animate_simulation(d3.select("#land").nodes()[0], start_state, do_left);

    async function start() {
        while (!(await s.next()).done) {
        }
    }

    start();
}

export function create_rllander_game(target_id) {
    let div=d3.select("#"+target_id).append("div")
        .attr("id", "surrounding_div")
        .style("height", 500)
        .style("width", 600);

    div.append("button")
        .attr("id", "start_button")
        .on("click", start_navigate)
        .text("Start");

    div.append("svg")
        .attr("id", "land")
        .style("height", 500)
        .style("width", 600);

    //d3.select("#start_button").on("click", start_navigate);
}



