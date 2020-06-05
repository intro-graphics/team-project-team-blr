import { tiny, defs } from './common.js';
import { Body } from './collisions-demo.js';
import { Shape_From_File } from './obj-file-demo.js';
import { Text_Line } from './text-demo.js';
// Pull these names into this module's scope for convenience:
const { vec3, unsafe3, vec4, vec, color, Mat4, Light, Shape, Material, Shader, Texture, Scene} = tiny;

export class Simulation extends Scene
{                                         // **Simulation** manages the stepping of simulation time.  Subclass it when making
                                          // a Scene that is a physics demo.  This technique is careful to totally decouple
                                          // the simulation from the frame rate (see below).
  constructor()
    { super();
      Object.assign( this, { time_accumulator: 0, time_scale: 1, t: 0, dt: 1/20, bodies: [], targets: [], steps_taken: 0 } );            
    }
  simulate( frame_time )
    {                                     // simulate(): Carefully advance time according to Glenn Fiedler's 
                                          // "Fix Your Timestep" blog post.
                                          // This line gives ourselves a way to trick the simulator into thinking
                                          // that the display framerate is running fast or slow:
      frame_time = this.time_scale * frame_time;

                                          // Avoid the spiral of death; limit the amount of time we will spend 
                                          // computing during this timestep if display lags:
      this.time_accumulator += Math.min( frame_time, 0.1 );
                                          // Repeatedly step the simulation until we're caught up with this frame:
      while ( Math.abs( this.time_accumulator ) >= this.dt )
      {                                                       // Single step of the simulation for all bodies:
        this.update_state( this.dt );
        for( let b of this.bodies )
          b.advance( this.dt );
        for( let t of this.targets )
          t.advance( this.dt );
                                          // Following the advice of the article, de-couple 
                                          // our simulation time from our frame rate:
        this.t                += Math.sign( frame_time ) * this.dt;
        this.time_accumulator -= Math.sign( frame_time ) * this.dt;
        this.steps_taken++;
      }
                                            // Store an interpolation factor for how close our frame fell in between
                                            // the two latest simulation time steps, so we can correctly blend the
                                            // two latest states and display the result.
      let alpha = this.time_accumulator / this.dt;
      for( let b of this.bodies ) b.blend_state( alpha );
      for( let t of this.targets) t.blend_state( alpha );
    }
  make_control_panel()
    {                       // make_control_panel(): Create the buttons for interacting with simulation time.
      this.key_triggered_button( "Speed up time", [ "Shift","T" ], () => this.time_scale *= 5           );
      this.key_triggered_button( "Slow down time",        [ "t" ], () => this.time_scale /= 5           ); this.new_line();
      this.live_string( box => { box.textContent = "Time scale: "  + this.time_scale                  } ); this.new_line();
      this.live_string( box => { box.textContent = "Fixed simulation time step size: "  + this.dt     } ); this.new_line();
      this.live_string( box => { box.textContent = this.steps_taken + " timesteps were taken so far." } );
    }
  display( context, program_state )
    {                                     // display(): advance the time and state of our whole simulation.
      if( program_state.animate ) 
        this.simulate( program_state.animation_delta_time );
                                          // Draw each shape at its current location:
      for( let b of this.bodies ) 
        b.shape.draw( context, program_state, b.drawn_location, b.material );
      for( let t of this.targets )
        t.shape.draw( context, program_state, t.drawn_location, t.material );
    }
  update_state( dt )      // update_state(): Your subclass of Simulation has to override this abstract function.
    { throw "Override this" }
}


export class Basketball_Game extends Simulation
  { constructor( context )     // The scene begins by requesting the camera, shapes, and materials it will need.
      { 
        super();    // First, include a secondary Scene that provides movement controls:
        this.mouse_enabled_canvases = new Set();

        this.shapes = {  square:    new defs.Square(),
                         ball:   new defs.Subdivision_Sphere( 4 ),
                         target: new defs.Subdivision_Sphere( 4 ),
                         cube:      new defs.Cube(),
                         //hoop:      new Shape_From_File("assets/basketball_hoop.obj"),
                         text:      new Text_Line(10)
                       };
                                     
        // Make some Material objects available to you:
        const t_phong = new defs.Textured_Phong();
        const phong = new defs.Phong_Shader();
        const bump  = new defs.Fake_Bump_Map();
        this.materials =
          { ball:     new Material( t_phong, {
                        ambient: 1,
                        diffusivity: 0,
                        specularity: 0,
                        texture: new Texture( "assets/ball.png") }),

            board:    new Material( phong, { color: color( 0.15, 0.15, 0.15, 1 ),
                        ambient: 1,
                        diffusivity: 0,
                        specularity: 0  }),

            text_img: new Material( t_phong, { color: color( 1, 1, 1, 1 ), 
                        ambient: 1,
                        diffusivity: 0,
                        specularity: 0,
                        texture: new Texture("assets/text.png") }),

            ground:   new Material( t_phong, {
                        ambient: 1,
                        diffusivity: 0,
                        specularity: 0,
                        texture: new Texture("assets/court.png") }),

            wall:     new Material( t_phong, {
                        ambient: 1,
                        diffusivity: 0,
                        specularity: 0,
                        texture: new Texture("assets/walls.png") }),
            
            target:   new Material( t_phong, {
                        ambient: 1,
                        diffusivity: 0,
                        specularity: 0, 
                        texture: new Texture("assets/target.png") }),
            ucla_w:   new Material( t_phong, {
                        ambient: 1,
                        diffusivity: 0,
                        specularity: 0,
                        texture: new Texture("assets/ucla.png") })

//          hoop:     new Material( t_phong, {
//                      ambient: 1,
//                      diffusivity: 0,
//                      specularity: 0,
//                      texture: new Texture("assets/basketball_hoop_re.jpg") })
          };

        this.colliders = [
        { intersect_test: Body.intersect_sphere, points: new defs.Subdivision_Sphere(1), leeway: .5 },
        { intersect_test: Body.intersect_sphere, points: new defs.Subdivision_Sphere(2), leeway: .3 },
        { intersect_test: Body.intersect_cube,   points: new defs.Cube(),                leeway: .1 }
                       ];
        this.collider_selection = 0;
        this.inactive_color = new Material( bump, { color: color( .5,.5,.5,1 ), ambient: .2 });
        this.active_color = this.inactive_color.override( { color: color( 0,0.5,0,1 ), ambient: .5 } );
        this.bright = new Material( phong, { color: color( 0,1,0,.5 ), ambient: 1 });

        /* ================================= ATTRIBUTES FOR BASKETBALL_SCENE ========================================= */

        this.launch = false;
        this.mouseDown = false;
        this.mouseX = 0;
        this.mouseY = 0;
        this.last_mouseX = 0;
        this.last_mouseY = 0;
        this.mouse_pos = Array(10).fill(0);
        this.has_collided = false;

        this.time_elapsed = 0;
        this.time_elapsed_seconds = 0;
        this.score = 0;
        this.high_score = 0;
        this.congrats = "";

        this.game_time = 120; // seconds
        this.bonus_time = 30; // seconds
        this.last_mouseX = 0;
        this.last_mouseY = 0;
        this.mouse_posX = Array(10).fill(0);
        this.mouse_posY = Array(10).fill(0);
      }

    add_mouse_controls( canvas )
    {                                       // add_mouse_controls():  Attach HTML mouse events to the drawing canvas.
                                            // First, measure mouse steering, for rotating the flyaround camera:
      this.mouse = { "from_center": vec( 0,0 ) };
      this.mouse_position = ( e, rect = canvas.getBoundingClientRect() ) => 
                                   vec( e.clientX - (rect.left + rect.right)/2, e.clientY - (rect.bottom + rect.top)/2 );

      // Set up mouse response.  The last one stops us from reacting if the mouse leaves the canvas:
      canvas  .addEventListener( "mousemove",  this.track.bind(this) );
      canvas  .addEventListener( "mousedown",  this.click.bind(this) );
      canvas  .addEventListener( "mouseup",    this.unclick.bind(this) );

    }

    click(event) 
      {
        this.mouseDown = true;
        this.launch = false;
        this.has_collided = false;
        if (this.game_time - this.time_elapsed_seconds < 0) {
          this.time_elapsed = 0;
          this.score = 0;
        }
      }

    unclick(event) 
      {
        this.mouseDown = false;
        this.launch = true;
      }

    track(event) 
      {
        if (this.mouseDown) 
        {
            this.mouseX = (this.mouse_position(event)[0])/34;
            this.mouseY = (183-this.mouse_position(event)[1])/33;
        }
      }

    get_timer_text(time_elapsed)
      {
        let total_seconds = this.game_time - this.time_elapsed_seconds;
        if (total_seconds < 0)
          return "00:00";
        let minutes = Math.floor(total_seconds / 60);
        let seconds = total_seconds - minutes * 60;
        let minutes_text = minutes < 10 ? "0" + minutes.toString() : minutes.toString();
        let seconds_text = seconds < 10 ? "0" + seconds.toString() : seconds.toString();
        return minutes_text + ":" + seconds_text;
      }

    get_score_text(score)
      {
        let score_text = score < 10 ? "0" + score.toString() : score.toString();
        return score_text;
      }

    make_control_panel()            // Draw the scene's buttons, setup their actions and keyboard shortcuts, and monitor live measurements.
      { this.key_triggered_button( "View scene",  [ "0" ], () => this.attached = () => this.initial_camera_location );
        this.new_line();
        this.key_triggered_button( "Previous collider", [ "b" ], this.decrease );
        this.key_triggered_button( "Next",              [ "n" ], this.increase );
        //super.make_control_panel();
      }
    increase() { this.collider_selection = Math.min( this.collider_selection + 1, this.colliders.length-1 ); }
    decrease() { this.collider_selection = Math.max( this.collider_selection - 1, 0 ) }

    update_state( dt )
      {               // update_state():  Override the base time-stepping code to say what this particular
                      // scene should do to its bodies every frame -- including applying forces.
                      // Generate additional moving bodies if there ever aren't enough:
        let mouse_velY = Math.abs(Math.min((this.mouseY - this.mouse_posY[0])/(150*dt), 1));
        let mouse_velX = (this.mouseX - this.mouse_posX[0])/(150*dt);

        // Create the ball object if user has thrown the ball  
        if( this.launch && this.bodies.length < 1 ) {
          let bt = this.ball_transform;
          this.bodies.push( new Body( this.shapes.ball, this.materials.ball, vec3( 1,1,1 ) ).emplace( bt, vec3(3*mouse_velX, 6*mouse_velY, -8*mouse_velY), -0.5, vec3(1, 0, 0) ));
        }
        
        // Create the target object 
        while( this.targets.length < 1 ) {
            let rand_x = Math.floor(Math.random() * 41) - 20;
            let rand_y = Math.floor(Math.random() * 19) + 2;
            console.log(rand_x, rand_y);
            let tt = Mat4.rotation( -1*Math.PI/2, 0,1,0 ).times(Mat4.translation( -35, rand_y, rand_x ));//rand_x, rand_y, -35 ));
            this.targets.push( new Body( this.shapes.target, this.materials.target, vec3( 0.15,1.5,1.4 ) ).emplace( tt, vec3(0,0,0), 0));
        }

        // increment timer
        this.time_elapsed += dt * 20;
        this.time_elapsed_seconds = Math.floor(this.time_elapsed / 120);

        // update high score if necessary
        if (this.score > this.high_score)
          this.high_score = this.score;

        // set congrats at the end of the game
        if (this.game_time - this.time_elapsed_seconds <= 0) {
          this.congrats = this.score.toString()
          ;
        }

        // move ball based on velocity, which gets decremented over time 
        for( let b of this.bodies ) {                                         
          b.linear_velocity[1] += dt * -1.8;

          // If about to fall through floor, reverse y velocity:
          if( b.center[1] < 1 && b.linear_velocity[1] < 0 ) {
            b.linear_velocity[1] *= -0.8;   // Dampen y velocity and angular velocity
            b.angular_velocity *= 0.8;
          }

          if( b.center[2] < -34 && b.linear_velocity[2] < 0 ) {
            b.linear_velocity[2] *= -0.8;   // Dampen z velocity and angular velocity 
            b.angular_velocity *= -0.8;
          }

          if( b.center[0] < -24 || b.center[0] > 24) {
            b.linear_velocity[0] *= -0.8;   // Dampen x velocity and angular velocity
            b.angular_velocity *= -0.8;
          }
        }

        this.last_mouseX = this.mouseX;
        this.last_mouseY = this.mouseY;

        this.mouse_pos.shift();
        this.mouse_pos[9] = this.mouseY;

        // Check for collisions between bodies
        const collider = this.colliders[ this.collider_selection ];
        let a = this.bodies[0];
        let b = this.targets[0];
        if( a )
        {
          a.inverse = Mat4.inverse( a.drawn_location );
          if ( b )
          {
            if( a.check_if_colliding( b, collider ) )
            {
              // increment score only if launch has not had a collision yet
              if (this.has_collided === false) {
                if (this.game_time - this.time_elapsed_seconds < this.bonus_time)
                  this.score += 5;
                else
                  this.score += 1;
                this.targets.pop();
              }
              this.has_collided = true;
            }
          }
        }
        this.mouse_posY.shift();
        this.mouse_posY[9] = this.mouseY;
        this.mouse_posX.shift();
        this.mouse_posX[9] = this.mouseX;
      }


    display( context, program_state )
      { 
        super.display( context, program_state )
        program_state.projection_transform = Mat4.perspective( Math.PI/4, context.width/context.height, .1, 1000 );
        program_state.lights = [ new Light( vec4( 5,-10,5,1 ), color( 0, 1, 1, 1 ), 1000 ) ];
        program_state.set_camera( Mat4.look_at( vec3( 0,9,17 ), vec3( 0,5,-20 ), vec3( 0,1,0 ) ));

        if( !context.scratchpad.controls ) 
        { 
          this.children.push( context.scratchpad.controls = new defs.Movement_Controls() );
          this.children.push( new defs.Program_State_Viewer() );
        }

        if( !this.mouse_enabled_canvases.has( context.canvas ) )
        { 
          this.add_mouse_controls( context.canvas );
          this.mouse_enabled_canvases.add( context.canvas );
          //program_state.set_camera( Mat4.look_at( vec3( 0,9,17 ), vec3( 0,5,-20 ), vec3( 0,1,0 ) ));
        }


        // Draw the basketball      // z = -23.5 is where the hoop's center is located
        if ( this.mouseY >= 0 ) 
        {
          this.ball_transform = Mat4.translation(0 + this.mouseX, 1 + this.mouseY, -5);
        }
        else    // Cannot drag the ball below the floor
        {
          this.ball_transform = Mat4.translation(0 + this.mouseX, 1, -5);
        }

        if (this.launch === false) {
          this.bodies = [];
          this.shapes.ball.draw( context, program_state, this.ball_transform, this.materials.ball );
        }

        // Draw the scoreboard
        let scoreboard_transform = Mat4.translation( 0,23,-35 )
                .times(Mat4.scale( 24,1.5,.25 ));
        this.shapes.cube.draw( context, program_state, scoreboard_transform, this.materials.board);

        // Draw "BONUS!" only for last x seconds, where x is bonus time
        if (this.game_time - this.time_elapsed_seconds < this.bonus_time && this.game_time - this.time_elapsed_seconds > 0) {
          let bonus_text_transform = Mat4.translation( -10,10,-34.99 )
                  .times(Mat4.scale( 3,3,.25 ));
          this.shapes.text.set_string( "Bonus!", context.context );
          this.shapes.text.draw( context, program_state, bonus_text_transform, this.materials.text_img );
        }

        // Draw congrats text at the end
        if (this.game_time - this.time_elapsed_seconds <= 0) {
          let congrats_text_1_transform = Mat4.translation( -20,5,-34.99 )
                  .times(Mat4.scale( 1,1,.25 ));
          let congrats_text_1 = this.congrats + " congrats";
          this.shapes.text.set_string( congrats_text_1, context.context );
          this.shapes.text.draw( context, program_state, congrats_text_1_transform, this.materials.text_img );

          let congrats_text_2_transform = Mat4.translation( -20,3,-34.99 )
                  .times(Mat4.scale( 1,1,.25 ));
          let congrats_text_2 = "to UCLA";
          this.shapes.text.set_string( congrats_text_2, context.context );
          this.shapes.text.draw( context, program_state, congrats_text_2_transform, this.materials.text_img );

          let congrats_text_3_transform = Mat4.translation( -20,1,-34.99 )
                  .times(Mat4.scale( 1,1,.25 ));
          let congrats_text_3 = "graduates!";
          this.shapes.text.set_string( congrats_text_3, context.context );
          this.shapes.text.draw( context, program_state, congrats_text_3_transform, this.materials.text_img );

          let wall_transform = Mat4.identity()
                .times(Mat4.rotation( -Math.PI/2, 0,1,0 ))
                .times(Mat4.rotation( Math.PI/2, 0,1,0 ))
                .times(Mat4.translation( -2,11,-34.999 ))
                .times(Mat4.scale( 28,12,0 ));
          this.shapes.square.draw( context, program_state, wall_transform, this.materials.ucla_w);
        }

        // Draw "TIMER"
        let timer_title_transform = Mat4.translation( -23,22.6,-34.7 )
                .times(Mat4.scale(0.65, 0.65, 0.65));
        this.shapes.text.set_string( "TIMER:", context.context );
        this.shapes.text.draw( context, program_state, timer_title_transform, this.materials.text_img );

        // Draw "SCORE"
        let score_title_transform = Mat4.translation( -5,22.6,-34.7 )
                .times(Mat4.scale(0.65, 0.65, 0.65));
        this.shapes.text.set_string( "SCORE:", context.context );
        this.shapes.text.draw( context, program_state, score_title_transform, this.materials.text_img );

        // Draw "HIGH SCORE"
        let high_score_title_transform = Mat4.translation( 9,22.6,-34.7 )
                .times(Mat4.scale(0.65, 0.65, 0.65));
        this.shapes.text.set_string( "HIGHSCORE:", context.context );
        this.shapes.text.draw( context, program_state, high_score_title_transform, this.materials.text_img );

        // Draw timer text
        let timer_text_transform = Mat4.translation( -16.8,22.6,-34.7 )
                .times(Mat4.scale(0.65, 0.65, 0.65));
        this.shapes.text.set_string( this.get_timer_text(this.time_elapsed), context.context );
        this.shapes.text.draw( context, program_state, timer_text_transform, this.materials.text_img );

        // Draw score text
        let score_text_transform = Mat4.translation( 1,22.6,-34.7 )
                .times(Mat4.scale(0.75, 0.75, 0.75));
        this.shapes.text.set_string( this.get_score_text(this.score), context.context );
        this.shapes.text.draw( context, program_state, score_text_transform, this.materials.text_img );

        // Draw high score text
        let high_score_text_transform = Mat4.translation( 19,22.6,-34.7 )
                .times(Mat4.scale(0.75, 0.75, 0.75));
        this.shapes.text.set_string( this.get_score_text(this.high_score), context.context );
        this.shapes.text.draw( context, program_state, high_score_text_transform, this.materials.text_img );

        // Draw the ground 
        let ground_transform = Mat4.rotation( Math.PI/2, 0,1,0 )
                .times(Mat4.rotation( Math.PI/2, 1,0,0 ))
                .times(Mat4.scale( 35,25,1 ));
        this.shapes.square.draw( context, program_state, ground_transform, this.materials.ground);

        // Draw the walls 
        let wall_transform = Mat4.rotation( Math.PI/2, 0,1,0 )
                .times(Mat4.translation( 0,15,25 ))
                .times(Mat4.scale( 35,15,0 ));
        this.shapes.square.draw( context, program_state, wall_transform, this.materials.wall);  // Left wall
        wall_transform = Mat4.identity()
                .times(Mat4.rotation( Math.PI/2, 0,1,0 ))
                .times(Mat4.translation( 0,15,-25 ))
                .times(Mat4.scale( 35,15,0 ));
        this.shapes.square.draw( context, program_state, wall_transform, this.materials.wall);  // Right wall
        wall_transform = Mat4.identity()
                .times(Mat4.rotation( -Math.PI/2, 0,1,0 ))
                .times(Mat4.rotation( Math.PI/2, 0,1,0 ))
                .times(Mat4.translation( 0,15,-35 ))
                .times(Mat4.scale( 25,15,0 ));
        this.shapes.square.draw( context, program_state, wall_transform, this.materials.wall);  // Front wall
      }
  }