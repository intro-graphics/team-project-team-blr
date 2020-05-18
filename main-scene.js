window.Basketball_Scene = window.classes.Basketball_Scene =
class Basketball_Scene extends Scene_Component
  { constructor( context, control_box )     // The scene begins by requesting the camera, shapes, and materials it will need.
      { super(   context, control_box );    // First, include a secondary Scene that provides movement controls:
        if( !context.globals.has_controls   ) 
          context.register_scene_component( new Movement_Controls( context, control_box.parentElement.insertCell() ) ); 

        context.globals.graphics_state.camera_transform = Mat4.look_at( Vec.of( 17,10,0 ), Vec.of( 0,8,0 ), Vec.of( 0,1,0 ) );//Vec.of( 0,10,20 ), Vec.of( 0,0,0 ), Vec.of( 0,1,0 ) );
        this.initial_camera_location = Mat4.inverse( context.globals.graphics_state.camera_transform );

        const r = context.width/context.height;
        context.globals.graphics_state.projection_transform = Mat4.perspective( Math.PI/4, r, .1, 1000 );

        const shapes = { square: new Square(),
                         sphere4: new Subdivision_Sphere( 4 ),
                         cube: new Cube(),
                         text: new Text_Line(10)
                       }

        this.submit_shapes( context, shapes );
                                     
                                     // Make some Material objects available to you:
        this.materials =
          { test:     context.get_instance( Phong_Shader ).material( Color.of( 1, 1, 0, 1 ), { ambient:.2 } ),

            ball:     context.get_instance( Phong_Shader ).material( Color.of( 0, 0, 0, 1 ), {
                        ambient: 1,
                        diffusivity: 0,
                        specularity: 0,
                        texture: context.get_instance("assets/ball.png", false) } ),

            board:    context.get_instance( Phong_Shader ).material( Color.of( 0.15, 0.15, 0.15, 1 ), {
                        ambient: 1,
                        diffusivity: 0,
                        specularity: 0  } ),

            text_img: context.get_instance( Phong_Shader ).material( Color.of( 1, 1, 1, 1 ), {
                        ambient: 1,
                        diffusivity: 0,
                        specularity: 0,
                        texture: context.get_instance("assets/text.png", false) } ),

            ground:   context.get_instance( Phong_Shader ).material( Color.of( 0, 0, 0, 1), {
                        ambient: 1,
                        diffusivity: 0,
                        specularity: 0,
                        texture: context.get_instance("assets/court.png", false) } ),

            wall:     context.get_instance( Phong_Shader ).material( Color.of( 0, 0, 0, 1 ), {
                        ambient: 1,
                        diffusivity: 0,
                        specularity: 0,
                        texture: context.get_instance("assets/walls.png", false),
            }),
    
          }

        this.lights = [ new Light( Vec.of( 5,-10,5,1 ), Color.of( 0, 1, 1, 1 ), 1000 ) ];

        // Attributes for Basketball_Scene
        this.score = 0;

      }

    make_control_panel()            // Draw the scene's buttons, setup their actions and keyboard shortcuts, and monitor live measurements.
      { this.key_triggered_button( "View scene",  [ "0" ], () => this.attached = () => this.initial_camera_location );
        this.new_line();
//         this.key_triggered_button( "Attach to planet 1", [ "1" ], () => this.attached = () => this.planet_1 );
//         this.key_triggered_button( "Attach to planet 2", [ "2" ], () => this.attached = () => this.planet_2 ); this.new_line();
//         this.key_triggered_button( "Attach to planet 3", [ "3" ], () => this.attached = () => this.planet_3 );
//         this.key_triggered_button( "Attach to planet 4", [ "4" ], () => this.attached = () => this.planet_4 ); this.new_line();
//         this.key_triggered_button( "Attach to planet 5", [ "5" ], () => this.attached = () => this.planet_5 );
//         this.key_triggered_button( "Attach to moon",     [ "m" ], () => this.attached = () => this.moon     );
      }

    display( graphics_state )
      { graphics_state.lights = this.lights;        // Use the lights stored in this.lights.
        const t = graphics_state.animation_time / 1000, dt = graphics_state.animation_delta_time / 1000;

        // Draw the static basketball - NEEDS MODIFICATION FOR MOUSE PICKING
        let ball_transform = Mat4.identity();
        ball_transform = ball_transform.times(Mat4.rotation( Math.PI/2, Vec.of(0,1,0) ));
        ball_transform = ball_transform.times(Mat4.translation( [0,1,-5] ));
        this.shapes.sphere4.draw( graphics_state, ball_transform, this.materials.ball );

        // Draw the scoreboard 
        let scoreboard_transform = Mat4.identity();
        scoreboard_transform = scoreboard_transform.times(Mat4.rotation( Math.PI/2, Vec.of(0,1,0)));
        scoreboard_transform = scoreboard_transform.times(Mat4.translation( [-15,19,-35] ));
        scoreboard_transform = scoreboard_transform.times(Mat4.scale( [8,4,.25] ));
        this.shapes.cube.draw( graphics_state, scoreboard_transform, this.materials.board)

        // Draw the ground 
        let ground_transform = Mat4.identity();
        ground_transform = ground_transform.times(Mat4.rotation( Math.PI/2, Vec.of(1,0,0) ));
        ground_transform = ground_transform.times(Mat4.scale( [35,25,1] ));
        this.shapes.square.draw( graphics_state, ground_transform, this.materials.ground);

        // Draw the walls 
        let wall_transform = Mat4.identity();
        wall_transform = wall_transform.times(Mat4.translation( [0,15,25] ));
        wall_transform = wall_transform.times(Mat4.scale( [35,15,0] ));
        this.shapes.square.draw( graphics_state, wall_transform, this.materials.wall);  // Left wall
        wall_transform = Mat4.identity();
        wall_transform = wall_transform.times(Mat4.translation( [0,15,-25] ));
        wall_transform = wall_transform.times(Mat4.scale( [35,15,0 ] ));
        this.shapes.square.draw( graphics_state, wall_transform, this.materials.wall);  // Right wall
        wall_transform = Mat4.identity();
        wall_transform = wall_transform.times(Mat4.rotation( Math.PI/2, Vec.of(0,1,0)));
        wall_transform = wall_transform.times(Mat4.translation( [0,15,-35] ));
        wall_transform = wall_transform.times(Mat4.scale( [25,15,0]));
        this.shapes.square.draw( graphics_state, wall_transform, this.materials.wall);  // Front wall


      }
  }
