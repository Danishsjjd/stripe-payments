import { classes } from "~/data/classes";

const StripeCards = () => {
  return (
    <div className={classes.gridContainer}>
      <p className={classes.gridLeftItem}>Normal Card:</p>{" "}
      <code>4242424242424242</code>
      <p className={classes.gridLeftItem}>3D Secure Card:</p>{" "}
      <code>4000002500003155</code>
    </div>
  );
};

export default StripeCards;
